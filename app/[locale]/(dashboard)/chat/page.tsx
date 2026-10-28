"use client";

import { Suspense, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { MapPin, MessageSquareText, Navigation, Paperclip, Send, ShieldCheck, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChatAttachment } from "@/components/orders/ChatAttachment";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const tNav = useTranslations("nav");
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

  if (roomsQuery.isLoading) {
    return (
      <AppPreloader variant="page" title={tNav("chat")} description={tChatPage("requestRoomsDescription")} blockCount={4} />
    );
  }

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <Card className="hidden rounded-2xl border-border/70 shadow-sm md:block">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {tNav("chat")}
            </Badge>
          </div>
          <div className="text-start">
            <CardTitle>{tNav("chat")}</CardTitle>
            <CardDescription>{tChatPage("requestRoomsDescription")}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="flex min-h-[30rem] flex-col overflow-hidden rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>{tChatPage("inboxTitle")}</CardTitle>
            <CardDescription>{tChatPage("inboxDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {roomsQuery.isError ? (
              <div className="space-y-2 text-sm">
                <p className="text-destructive">{tCommon("error")}</p>
                <Button size="sm" variant="outline" onClick={() => void roomsQuery.refetch()}>{tCommon("retry")}</Button>
              </div>
            ) : null}

            {inboxEntries.map((entry) => {
              const isActive = activeRoom?.case_id === entry.caseId;
              const room = entry.preferredRoom;

              return (
                <button
                  key={entry.caseId}
                  type="button"
                  onClick={() => setCurrentRoomId(room.id)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-start",
                    isActive
                      ? "border-primary bg-primary/5"
                      : entry.unreadCount > 0
                        ? "border-emerald-200/80 bg-emerald-50/50"
                        : "border-border/70 bg-background",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 font-semibold">{room.provider_name || tChatPage("providerFallback")}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            entry.isOpen ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-700",
                          )}
                        >
                          {entry.isOpen ? tChatPage("roomOpen") : tChatPage("roomClosed")}
                        </Badge>
                        {entry.unreadCount > 0 ? (
                          <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1">
                            {entry.unreadCount > 9 ? "9+" : entry.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tChatPage("requestNumber", { id: entry.caseId.slice(0, 8).toUpperCase() })}
                        {room.service_name ? ` - ${room.service_name}` : ""}
                      </p>
                      <p
                        className={cn(
                          "mt-2 line-clamp-1 text-sm",
                          entry.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {roomPreview(room, tChatPage("attachmentPreview"), tChatPage("noMessages"))}
                      </p>
                    </div>
                    <div className="text-end text-[11px] text-muted-foreground">
                      {formatRelativeTime(entry.lastActivityAt, locale)}
                    </div>
                  </div>
                </button>
              );
            })}

            {!inboxEntries.length && !roomsQuery.isError ? (
              <div className="flex min-h-52 items-center justify-center">
                <div className="text-center">
                  <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-primary" />
                  <p className="text-sm font-semibold">{tChatPage("noInboxThreads")}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex min-h-[38rem] flex-col overflow-hidden rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>{activeRoom?.provider_name || tChatPage("providerFallback")}</CardTitle>
            <CardDescription>{tChatPage("requestThreadDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            {activeRoom && activeEntry ? (
              <div className="mb-3 space-y-3">
                <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{activeRoom.service_name || tChatPage("requestRoomLabel")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tChatPage("requestNumber", { id: activeRoom.case_id.slice(0, 8).toUpperCase() })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        activeRoom.can_send ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-700",
                      )}
                    >
                      {activeRoom.can_send ? tChatPage("roomOpen") : tChatPage("roomClosed")}
                    </Badge>
                  </div>
                </div>

                {activeEntry.rooms.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeEntry.rooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setCurrentRoomId(room.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                          currentRoomId === room.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 bg-background hover:bg-muted/40",
                        )}
                      >
                        <span>{room.service_name || room.provider_name || tChatPage("requestRoomLabel")}</span>
                        {Number(room.unread_count || 0) > 0 ? (
                          <span
                            className={cn(
                              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold",
                              currentRoomId === room.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500 text-white",
                            )}
                          >
                            {Number(room.unread_count) > 9 ? "9+" : Number(room.unread_count)}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {!connected && activeRoom.can_send ? (
                  <p className="text-xs text-muted-foreground">{tChatPage("chatConnecting")}</p>
                ) : null}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border p-3">
              {!currentRoomId ? (
                <p className="text-sm text-muted-foreground">{tChatPage("selectThreadHint")}</p>
              ) : messagesQuery.isLoading ? (
                <AppPreloader variant="panel" title={tCommon("loading")} blockCount={2} blockVariant="line" className="min-h-[18rem]" />
              ) : messagesQuery.isError ? (
                <div className="flex min-h-[18rem] items-center justify-center text-center">
                  <p className="text-sm text-destructive">{tCommon("error")}</p>
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
                          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {!mine && senderLabel ? (
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{senderLabel}</p>
                        ) : null}
                        {textContent ? <p className="whitespace-pre-wrap break-words">{textContent}</p> : null}
                        {locationInfo ? (
                          <div
                            className={cn(
                              "mt-2 rounded-lg border px-3 py-2",
                              mine ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border/70 bg-background",
                            )}
                          >
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
                              <MapPin className="h-3.5 w-3.5" />
                              {tChatPage("locationShared")}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <a
                                href={primaryMapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium",
                                  mine
                                    ? "border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
                                    : "border-border/70 bg-background hover:bg-muted",
                                )}
                              >
                                <MapPin className="h-3 w-3" />
                                {tChatPage("viewLocation")}
                              </a>
                              <a
                                href={primaryDirUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium",
                                  mine
                                    ? "border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
                                    : "border-border/70 bg-background hover:bg-muted",
                                )}
                              >
                                <Navigation className="h-3 w-3" />
                                {tChatPage("getDirections")}
                              </a>
                            </div>
                          </div>
                        ) : null}
                        {message.has_file ? <ChatAttachment message={message} mine={mine} /> : null}
                        <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {formatRelativeTime(message.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-[18rem] items-center justify-center">
                  <p className="text-sm text-muted-foreground">{tChatPage("noMessages")}</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {activeRoom && !activeRoom.can_send ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {tChatPage("requestClosedNotice")}
              </div>
            ) : currentRoomId ? (
              <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
                {attachment ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                    <span className="truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                      aria-label={tChatPage("removeAttachment")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={messageText}
                    maxLength={4000}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder={tChatPage("typeMessage")}
                    className="min-w-[12rem] flex-1"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ATTACHMENT_ACCEPT}
                    className="hidden"
                    onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendMutation.isPending}
                    title={tChatPage("file")}
                    aria-label={tChatPage("file")}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleShareLocation()}
                    disabled={isSharingLocation || sendMutation.isPending}
                    title={tChatPage("shareLocation")}
                  >
                    <MapPin className="h-4 w-4" />
                    {isSharingLocation ? tChatPage("sharing") : tChatPage("shareLocation")}
                  </Button>
                  <Button type="submit" disabled={sendMutation.isPending || (!messageText.trim() && !attachment)}>
                    <Send className="h-4 w-4 rtl:rotate-180" />
                    {tChatPage("send")}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
