"use client";

import { Suspense, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft, ArrowRight, Loader2, MapPin, MessageSquareText, Navigation, Paperclip, Send, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChatAttachment } from "@/components/orders/ChatAttachment";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import { ListSkeleton, Shimmer, appButton } from "@/components/app/ui";
import { ProviderAvatar } from "@/components/orders/ProviderAvatar";
import { casesApi, type ChatMessage, type ChatRoom } from "@/lib/api/cases";
import {
  extractLocationInfo,
  formatLocationMessage,
  isAppleDevice,
  shareLocationWithBestAccuracy,
  ShareLocationError,
} from "@/lib/chat-location";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { cn, formatRelativeTime } from "@/lib/utils";

// new_message / chat_unread_updated arrive over the socket; these intervals are only a fallback.
const FALLBACK_REFETCH_INTERVAL_MS = 60_000;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm";

type CaseInboxEntry = {
  caseId: string;
  rooms: ChatRoom[];
  preferredRoom: ChatRoom;
  isOpen: boolean;
  lastActivityAt: string;
  unreadCount: number;
};

function shouldRetryChatQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 429) return false;
  return failureCount < 1;
}

function toTimeValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function selectPreferredRoom(rooms: ChatRoom[]) {
  return [...rooms].sort((a, b) => {
    const timeDelta = toTimeValue(b.last_message_at || b.created_at) - toTimeValue(a.last_message_at || a.created_at);
    if (timeDelta !== 0) return timeDelta;
    return Number(b.unread_count || 0) - Number(a.unread_count || 0);
  })[0];
}

function roomPreview(room: ChatRoom, attachmentLabel: string, emptyLabel: string) {
  const preview = room.last_message_preview?.trim();
  if (preview) return preview;
  if (room.last_message_file_name) return `${attachmentLabel}: ${room.last_message_file_name}`;
  return emptyLabel;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInbox />
    </Suspense>
  );
}

function ChatInbox() {
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const tApp = useTranslations("app.chat");
  const tChatPage = useTranslations("chatPage");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { socket, connected } = useRealtime();

  const [currentRoomId, setCurrentRoomId] = useState(() => searchParams.get("room") || "");
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  // Mobile shows either the inbox or one conversation; a ?room= link opens the conversation directly.
  const [showThread, setShowThread] = useState(() => Boolean(searchParams.get("room")));
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roomsQuery = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => casesApi.listChatRooms(),
    refetchInterval: FALLBACK_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const inboxEntries = useMemo<CaseInboxEntry[]>(() => {
    const byCase = new Map<string, ChatRoom[]>();
    (roomsQuery.data || []).forEach((room) => {
      byCase.set(room.case_id, [...(byCase.get(room.case_id) || []), room]);
    });

    return Array.from(byCase.entries())
      .map(([caseId, rooms]) => {
        const preferredRoom = selectPreferredRoom(rooms);
        return {
          caseId,
          rooms,
          preferredRoom,
          isOpen: rooms.some((room) => room.can_send),
          lastActivityAt: preferredRoom.last_message_at || preferredRoom.created_at,
          unreadCount: rooms.reduce((sum, room) => sum + Number(room.unread_count || 0), 0),
        };
      })
      .sort((a, b) => {
        if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
        return toTimeValue(b.lastActivityAt) - toTimeValue(a.lastActivityAt);
      });
  }, [roomsQuery.data]);

  const activeRoom = useMemo(
    () => (roomsQuery.data || []).find((room) => room.id === currentRoomId) || null,
    [currentRoomId, roomsQuery.data],
  );
  const activeEntry = activeRoom ? inboxEntries.find((entry) => entry.caseId === activeRoom.case_id) || null : null;

  // Fall back to the most recent conversation when nothing (or an unknown room) is selected.
  useEffect(() => {
    if (!roomsQuery.data) return;
    if (currentRoomId && roomsQuery.data.some((room) => room.id === currentRoomId)) return;
    setCurrentRoomId(inboxEntries[0]?.preferredRoom.id || "");
  }, [currentRoomId, inboxEntries, roomsQuery.data]);

  const messagesQueryKey = useMemo(() => ["chat", "messages", currentRoomId] as const, [currentRoomId]);

  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async () => (await casesApi.getChatMessages(currentRoomId, { limit: 50 })).data,
    enabled: Boolean(currentRoomId),
    refetchInterval: FALLBACK_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  // Join the room over the socket to receive new_message events (re-join after every reconnect).
  useEffect(() => {
    if (!socket || !currentRoomId) return undefined;

    const join = () => socket.emit("join_room", { room_id: currentRoomId });
    const handleNewMessage = (message?: ChatMessage) => {
      // Joining again marks the incoming message as read on the server.
      if (message?.room_id === currentRoomId && message.sender_role !== "PATIENT") join();
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("connect", join);
      socket.off("new_message", handleNewMessage);
      socket.emit("leave_room", { room_id: currentRoomId });
    };
  }, [currentRoomId, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(["chat", "messages", message.room_id], (current = []) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    },
    [queryClient],
  );

  const sendMutation = useMutation({
    mutationFn: (payload: { content?: string; file?: File | null }) => casesApi.sendChatMessage(currentRoomId, payload),
    onSuccess: (message) => {
      appendMessage(message);
      setMessageText("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error) => toast.error(getOrderErrorMessage(error, tOrders)),
  });

  const canSend = Boolean(activeRoom?.can_send);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentRoomId || !canSend) return;

    const content = messageText.trim();
    if (!content && !attachment) {
      toast.error(tChatPage("emptyMessage"));
      return;
    }

    sendMutation.mutate({ content, file: attachment });
  };

  const handleFileChange = (file: File | null) => {
    if (file && file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(tChatPage("attachmentTooLarge"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setAttachment(file);
  };

  const handleShareLocation = async () => {
    if (isSharingLocation || !currentRoomId || !canSend) return;

    setIsSharingLocation(true);
    try {
      const reading = await shareLocationWithBestAccuracy({ durationMs: 8000, targetAccuracy: 15, timeoutMs: 15000 });
      const accuracyMeters = Math.round(reading.accuracy);
      const content = formatLocationMessage(reading.latitude, reading.longitude, tChatPage("chatLocationMessagePrefix"));
      const message = await casesApi.sendChatMessage(currentRoomId, { content });
      appendMessage(message);

      if (accuracyMeters > 100) {
        toast.warning(tChatPage("chatLocationLowAccuracy", { meters: accuracyMeters }));
      } else {
        toast.success(tChatPage("chatLocationSentWithAccuracy", { meters: accuracyMeters }));
      }
    } catch (error) {
      if (error instanceof ShareLocationError) {
        if (error.code === "UNSUPPORTED") toast.error(tChatPage("chatLocationNotSupported"));
        else if (error.code === "PERMISSION_DENIED") toast.error(tChatPage("chatLocationPermissionDenied"));
        else toast.error(tChatPage("chatLocationFailed"));
      } else {
        toast.error(getOrderErrorMessage(error, tOrders));
      }
    } finally {
      setIsSharingLocation(false);
    }
  };

  const messages = messagesQuery.data || [];
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  if (roomsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const inbox = (
    <div className={cn("app-card flex min-h-0 flex-col overflow-hidden", showThread && "hidden lg:flex")}>
      <div className="border-b border-[var(--app-card-border)] px-4 py-3.5">
        <p className="text-[17px] font-bold text-foreground">{tApp("conversations")}</p>
        <p className="text-[13px] text-muted-foreground">{tChatPage("requestRoomsDescription")}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {roomsQuery.isError ? (
          <div className="space-y-2 p-4 text-[14px]">
            <p className="text-rose-700 dark:text-rose-300">{tCommon("error")}</p>
            <button type="button" className={cn(appButton.secondary, "min-h-11")} onClick={() => void roomsQuery.refetch()}>
              {tCommon("retry")}
            </button>
          </div>
        ) : null}

        {inboxEntries.map((entry) => {
          const isActive = activeRoom?.case_id === entry.caseId;
          const room = entry.preferredRoom;

          return (
            <button
              key={entry.caseId}
              type="button"
              onClick={() => {
                setCurrentRoomId(room.id);
                setShowThread(true);
              }}
              className={cn(
                "flex w-full items-center gap-3 border-b border-[var(--app-card-border)] px-4 py-3.5 text-start transition-colors last:border-0",
                isActive ? "lg:bg-[#eef6f3] lg:dark:bg-teal-500/10" : "hover:bg-[#f7faf9] dark:hover:bg-white/5",
              )}
            >
              <ProviderAvatar name={room.provider_name} url={room.provider_avatar_url} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-bold text-foreground">{room.provider_name || tChatPage("providerFallback")}</p>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{formatRelativeTime(entry.lastActivityAt, locale)}</span>
                </div>
                <p className="truncate text-[12.5px] text-muted-foreground">
                  {tChatPage("requestNumber", { id: entry.caseId.slice(0, 8).toUpperCase() })}
                  {room.service_name ? ` · ${room.service_name}` : ""}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className={cn("min-w-0 flex-1 truncate text-[14px]", entry.unreadCount > 0 ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {roomPreview(room, tChatPage("attachmentPreview"), tChatPage("noMessages"))}
                  </p>
                  {entry.unreadCount > 0 ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#104d49] px-1.5 text-[11px] font-bold text-white">
                      {entry.unreadCount > 9 ? "9+" : entry.unreadCount}
                    </span>
                  ) : !entry.isOpen ? (
                    <span className="shrink-0 rounded-full bg-[#eff1f1] px-2 py-0.5 text-[11px] font-semibold text-[#545c5f] dark:bg-white/10 dark:text-slate-300">
                      {tChatPage("roomClosed")}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}

        {!inboxEntries.length && !roomsQuery.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100">
              <MessageSquareText className="h-8 w-8" />
            </span>
            <p className="mt-4 text-[16px] font-bold text-foreground">{tChatPage("noInboxThreads")}</p>
            <p className="mt-1 text-[14px] leading-6 text-muted-foreground">{tChatPage("requestRoomsDescription")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  const thread = (
    <div className={cn("app-card flex min-h-0 flex-col overflow-hidden", !showThread && "hidden lg:flex")}>
      <div className="flex items-center gap-3 border-b border-[var(--app-card-border)] px-3 py-2.5">
        <button
          type="button"
          onClick={() => setShowThread(false)}
          aria-label={tApp("conversations")}
          className="app-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#f1f5f4] dark:hover:bg-white/5 lg:hidden"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        {activeRoom ? <ProviderAvatar name={activeRoom.provider_name} url={activeRoom.provider_avatar_url} className="h-10 w-10" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-foreground">{activeRoom?.provider_name || tChatPage("providerFallback")}</p>
          {activeRoom ? (
            <p className="truncate text-[12.5px] text-muted-foreground">
              {activeRoom.service_name || tChatPage("requestRoomLabel")} · {tChatPage("requestNumber", { id: activeRoom.case_id.slice(0, 8).toUpperCase() })}
            </p>
          ) : null}
        </div>
        {activeRoom ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold",
              activeRoom.can_send ? "bg-[#e5f5ea] text-[#1c6e3d] dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-[#eff1f1] text-[#545c5f] dark:bg-white/10 dark:text-slate-300",
            )}
          >
            {activeRoom.can_send ? tChatPage("roomOpen") : tChatPage("roomClosed")}
          </span>
        ) : null}
      </div>

      {activeRoom && activeEntry && activeEntry.rooms.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--app-card-border)] px-3 py-2 no-scrollbar">
          {activeEntry.rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setCurrentRoomId(room.id)}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition",
                currentRoomId === room.id ? "bg-[#104d49] text-white" : "bg-[#f1f5f4] text-foreground hover:bg-[#e6eeeb] dark:bg-white/5",
              )}
            >
              <span>{room.service_name || room.provider_name || tChatPage("requestRoomLabel")}</span>
              {Number(room.unread_count || 0) > 0 ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold",
                    currentRoomId === room.id ? "bg-white/20 text-white" : "bg-[#e5484d] text-white",
                  )}
                >
                  {Number(room.unread_count) > 9 ? "9+" : Number(room.unread_count)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#f7faf9] px-3 py-4 dark:bg-black/10">
        {!currentRoomId ? (
          <p className="py-10 text-center text-[14px] text-muted-foreground">{tChatPage("selectThreadHint")}</p>
        ) : messagesQuery.isLoading ? (
          <div className="space-y-3">
            <Shimmer className="h-14 w-2/3 rounded-2xl" />
            <Shimmer className="ms-auto h-12 w-1/2 rounded-2xl" />
            <Shimmer className="h-16 w-3/5 rounded-2xl" />
          </div>
        ) : messagesQuery.isError ? (
          <div className="flex min-h-[12rem] items-center justify-center text-center">
            <p className="text-[14px] text-rose-700 dark:text-rose-300">{tCommon("error")}</p>
          </div>
        ) : messages.length ? (
          messages.map((message) => {
            const mine = message.sender_role === "PATIENT";
            const locationInfo = extractLocationInfo(message.content);
            const textContent = locationInfo ? locationInfo.displayText : message.content;
            const preferApple = isAppleDevice();
            const primaryMapUrl = preferApple ? locationInfo?.appleMapsUrl : locationInfo?.googleMapsUrl;
            const primaryDirUrl = preferApple ? locationInfo?.appleDirectionsUrl : locationInfo?.googleDirectionsUrl;
            const senderLabel =
              message.sender_role === "PROVIDER"
                ? activeRoom?.provider_name || tChatPage("providerFallback")
                : message.sender_role === "ADMIN"
                  ? tChatPage("adminLabel")
                  : null;

            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[82%] px-3.5 py-2.5 text-[15px] leading-6 shadow-sm",
                    mine
                      ? "rounded-[20px] rounded-ee-md bg-[#104d49] text-white"
                      : "rounded-[20px] rounded-es-md bg-card text-foreground ring-1 ring-[var(--app-card-border)]",
                  )}
                >
                  {!mine && senderLabel ? (
                    <p className="mb-0.5 text-[12px] font-bold text-[#5a7a50] dark:text-lime-200">{senderLabel}</p>
                  ) : null}
                  {textContent ? <p className="whitespace-pre-wrap break-words">{textContent}</p> : null}
                  {locationInfo ? (
                    <div className={cn("mt-2 rounded-xl px-3 py-2", mine ? "bg-white/10" : "bg-[#f1f5f4] dark:bg-white/5")}>
                      <div className="flex items-center gap-2 text-[12px] font-bold">
                        <MapPin className="h-3.5 w-3.5" />
                        {tChatPage("locationShared")}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={primaryMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold",
                            mine ? "bg-white/15 text-white hover:bg-white/25" : "bg-card text-[#104d49] ring-1 ring-[var(--app-card-border)] dark:text-teal-200",
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {tChatPage("viewLocation")}
                        </a>
                        <a
                          href={primaryDirUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold",
                            mine ? "bg-white/15 text-white hover:bg-white/25" : "bg-card text-[#104d49] ring-1 ring-[var(--app-card-border)] dark:text-teal-200",
                          )}
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          {tChatPage("getDirections")}
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {message.has_file ? <ChatAttachment message={message} mine={mine} /> : null}
                  <p className={cn("mt-1 text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>
                    {formatRelativeTime(message.created_at, locale)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-[12rem] flex-col items-center justify-center text-center">
            <MessageSquareText className="h-10 w-10 text-[#86ab62]" />
            <p className="mt-3 text-[14px] text-muted-foreground">{tChatPage("noMessages")}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {activeRoom && !activeRoom.can_send ? (
        <div className="border-t border-[var(--app-card-border)] bg-[#fff8ea] px-4 py-3 text-[14px] leading-6 text-[#6b4a00] dark:bg-amber-500/10 dark:text-amber-100">
          {tChatPage("requestClosedNotice")}
        </div>
      ) : currentRoomId ? (
        <form className="space-y-2 border-t border-[var(--app-card-border)] bg-card p-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)]" onSubmit={handleSubmit}>
          {!connected && activeRoom?.can_send ? (
            <p className="px-2 text-[12px] text-muted-foreground">{tChatPage("chatConnecting")}</p>
          ) : null}
          {attachment ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5f4] px-3 py-2 text-[13px] dark:bg-white/5">
              <span className="truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => handleFileChange(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                aria-label={tChatPage("removeAttachment")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMutation.isPending}
              title={tChatPage("file")}
              aria-label={tChatPage("file")}
              className="app-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-[#f1f5f4] disabled:opacity-50 dark:hover:bg-white/5"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void handleShareLocation()}
              disabled={isSharingLocation || sendMutation.isPending}
              title={tChatPage("shareLocation")}
              aria-label={tChatPage("shareLocation")}
              className="app-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-[#f1f5f4] disabled:opacity-50 dark:hover:bg-white/5"
            >
              {isSharingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
            </button>
            <input
              value={messageText}
              maxLength={4000}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder={tChatPage("typeMessage")}
              className="h-12 min-w-0 flex-1 rounded-full bg-[#f1f5f4] px-4 text-[16px] outline-none ring-[#86ab62] placeholder:text-muted-foreground focus:ring-2 dark:bg-white/5"
            />
            <button
              type="submit"
              disabled={sendMutation.isPending || (!messageText.trim() && !attachment)}
              aria-label={tChatPage("send")}
              className="app-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#104d49] text-white shadow-[0_8px_18px_-8px_rgba(16,77,73,0.8)] disabled:opacity-40"
            >
              {sendMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rtl:-scale-x-100" />}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );

  return (
    <div
      className="mx-auto grid h-[calc(100dvh-68px-2rem)] max-w-5xl gap-4 md:h-[calc(100dvh-76px-3.5rem)] lg:grid-cols-[22rem_minmax(0,1fr)]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {inbox}
      {thread}
    </div>
  );
}
