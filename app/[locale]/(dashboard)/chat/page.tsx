"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { MapPin, MessageSquareText, Navigation, Send, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  casesApi,
  type PatientCase,
  type PatientCaseChatRoom,
} from "@/lib/api/cases";
import type { RequestChatMessage, RequestStatus } from "@/lib/api/types";
import { translateEnumValue } from "@/lib/i18n";
import {
  extractLocationInfo,
  formatLocationMessage,
  isAppleDevice,
  shareLocationWithBestAccuracy,
  ShareLocationError,
} from "@/lib/chat-location";
import { connectAppSocket, type AppSocket } from "@/lib/socket-client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn, formatRelativeTime } from "@/lib/utils";

const CASE_CHAT_STATUSES = new Set<RequestStatus>([
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED",
]);
const CASE_ACTIVE_STATUSES = new Set<RequestStatus>([
  "IN_PROGRESS",
  "COMPLETED",
]);
const CASE_ROOM_METADATA_QUERY_KEY = "case-room-metadata";

type CaseInboxEntry = {
  caseItem: PatientCase;
  isOpen: boolean;
  lastActivityAt: string;
  preview: string;
  preferredRoomId: string | null;
  roomCount: number;
  rooms: PatientCaseChatRoom[];
  subtitle: string;
  title: string;
  unreadCount: number;
};

function shouldRetryChatQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 429) return false;
  return failureCount < 1;
}

function toTimeValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function getCaseStatus(caseItem: PatientCase) {
  return String(caseItem.status || "PENDING") as RequestStatus;
}

function getCaseTimestamp(caseItem: PatientCase) {
  return caseItem.closed_at || caseItem.updated_at || caseItem.created_at;
}

function isAttachmentPreview(value?: string | null) {
  if (!value) return false;

  return (
    /^(https?:\/\/|\/?uploads\/)/i.test(value)
    || /\.(jpg|jpeg|png|gif|webp|pdf|docx?|xlsx?|zip)(\?|$)/i.test(value)
  );
}

function getCaseRoomPreview(
  room: PatientCaseChatRoom | null | undefined,
  attachmentLabel: string,
  emptyLabel: string
) {
  const preview = room?.last_message_preview?.trim();
  if (!preview) return emptyLabel;
  return isAttachmentPreview(preview) ? attachmentLabel : preview;
}

function selectPreferredRoom(rooms: PatientCaseChatRoom[]) {
  if (!rooms.length) return null;

  return [...rooms].sort((a, b) => {
    const timeDelta =
      toTimeValue(b.last_message_at || b.created_at)
      - toTimeValue(a.last_message_at || a.created_at);

    if (timeDelta !== 0) return timeDelta;
    return Number(b.unread_count || 0) - Number(a.unread_count || 0);
  })[0];
}

function ChatMediaLink({
  filePath,
  fileName,
  openLabel,
}: {
  filePath: string;
  fileName?: string | null;
  openLabel: string;
}) {
  const href = casesApi.resolveMediaUrl(filePath) || filePath;

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block text-xs underline underline-offset-4"
    >
      {fileName || openLabel}
    </a>
  );
}

export default function ChatPage() {
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const tNav = useTranslations("nav");
  const tChatPage = useTranslations("chatPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseSocketReady, setCaseSocketReady] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<AppSocket | null>(null);

  const casesQuery = useQuery({
    queryKey: ["patient-chat", "cases"],
    queryFn: async () => (await casesApi.list({ limit: 100 })).data.data,
    enabled: Boolean(accessToken),
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const visibleCases = useMemo(
    () =>
      (casesQuery.data || []).filter((caseItem) => {
        const status = getCaseStatus(caseItem);
        const hasProvider =
          Boolean(caseItem.lead_provider_id)
          || caseItem.services.some((service) => Boolean(service.provider_id));

        return CASE_CHAT_STATUSES.has(status) && hasProvider;
      }),
    [casesQuery.data]
  );

  const caseRoomMetadataQuery = useQuery({
    queryKey: [
      "patient-chat",
      CASE_ROOM_METADATA_QUERY_KEY,
      visibleCases.map((caseItem) => caseItem.id).join(","),
    ],
    enabled: visibleCases.length > 0,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
    queryFn: async () => {
      const entries = await Promise.all(
        visibleCases.map(async (caseItem) => {
          try {
            const rooms = (await casesApi.getChatRooms(caseItem.id)).data.data || [];
            return [caseItem.id, rooms] as const;
          } catch {
            return [caseItem.id, []] as const;
          }
        })
      );

      return Object.fromEntries(entries) as Record<string, PatientCaseChatRoom[]>;
    },
  });

  const caseInboxEntries = useMemo(
    () =>
      visibleCases
        .map((caseItem) => {
          const rooms = caseRoomMetadataQuery.data?.[caseItem.id] || [];
          const preferredRoom = selectPreferredRoom(rooms);
          const status = getCaseStatus(caseItem);

          return {
            caseItem,
            isOpen: CASE_ACTIVE_STATUSES.has(status),
            lastActivityAt:
              preferredRoom?.last_message_at || getCaseTimestamp(caseItem),
            preview: getCaseRoomPreview(
              preferredRoom,
              tChatPage("attachmentPreview"),
              tChatPage("noMessages")
            ),
            preferredRoomId: preferredRoom?.id || null,
            roomCount: rooms.length,
            rooms,
            subtitle:
              preferredRoom?.service_name
              || caseItem.services[0]?.service_name
              || translateEnumValue(
                caseItem.services[0]?.service_kind || "MEDICAL",
                tEnums
              )
              || tChatPage("requestRoomLabel"),
            title:
              preferredRoom?.provider_name
              || caseItem.lead_provider_name
              || tChatPage("providerFallback"),
            unreadCount: rooms.reduce(
              (sum, room) => sum + Number(room.unread_count || 0),
              0
            ),
          } satisfies CaseInboxEntry;
        })
        .filter((entry) => entry.roomCount > 0)
        .sort((a, b) => {
          if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
          return toTimeValue(b.lastActivityAt) - toTimeValue(a.lastActivityAt);
        }),
    [caseRoomMetadataQuery.data, tChatPage, tEnums, visibleCases]
  );

  const activeCaseEntry = useMemo(
    () =>
      activeCaseId
        ? caseInboxEntries.find((entry) => entry.caseItem.id === activeCaseId) || null
        : null,
    [activeCaseId, caseInboxEntries]
  );

  const activeCaseRoom = useMemo(() => {
    if (!activeCaseEntry) return null;

    return (
      activeCaseEntry.rooms.find((room) => room.id === currentRoomId)
      || selectPreferredRoom(activeCaseEntry.rooms)
      || null
    );
  }, [activeCaseEntry, currentRoomId]);

  const openCaseThread = useCallback((caseId: string, roomId?: string | null) => {
    setActiveCaseId(caseId);
    setCaseSocketReady(false);
    setCurrentRoomId(roomId || "");
    setMessageText("");
  }, []);

  useEffect(() => {
    if (!caseInboxEntries.length) {
      setActiveCaseId(null);
      setCurrentRoomId("");
      setCaseSocketReady(false);
      return;
    }

    const activeEntryExists = activeCaseId
      ? caseInboxEntries.some((entry) => entry.caseItem.id === activeCaseId)
      : false;

    if (!activeEntryExists) {
      const firstEntry = caseInboxEntries[0];
      setActiveCaseId(firstEntry.caseItem.id);
      setCurrentRoomId(firstEntry.preferredRoomId || "");
      setCaseSocketReady(false);
    }
  }, [activeCaseId, caseInboxEntries]);

  useEffect(() => {
    if (!activeCaseEntry?.rooms.length) {
      setCurrentRoomId("");
      setCaseSocketReady(false);
      return;
    }

    const roomExists = activeCaseEntry.rooms.some((room) => room.id === currentRoomId);
    if (!roomExists) {
      setCurrentRoomId(activeCaseEntry.preferredRoomId || activeCaseEntry.rooms[0].id);
      setCaseSocketReady(false);
    }
  }, [activeCaseEntry, currentRoomId]);

  const activeCaseMessagesQueryKey = useMemo(
    () =>
      [
        "patient-chat",
        "case",
        activeCaseId || "none",
        currentRoomId || "none",
        "messages",
      ] as const,
    [activeCaseId, currentRoomId]
  );

  const caseMessagesQuery = useQuery({
    queryKey: activeCaseMessagesQueryKey,
    queryFn: async () =>
      (await casesApi.getChatMessages(currentRoomId, { limit: 50 })).data
        .data as RequestChatMessage[],
    enabled: Boolean(activeCaseId && currentRoomId),
    retry: shouldRetryChatQuery,
  });

  useEffect(() => {
    if (!accessToken || !activeCaseId || !currentRoomId) {
      setCaseSocketReady(false);
      return undefined;
    }

    let disposed = false;
    let currentSocket: AppSocket | null = null;

    setCaseSocketReady(false);

    void connectAppSocket(accessToken).then((socket) => {
      if (!socket) return;

      if (disposed) {
        socket.disconnect();
        return;
      }

      currentSocket = socket;
      socketRef.current = socket;

      const joinRoom = () => {
        socket.emit("join_room", { room_id: currentRoomId });
      };

      socket.on("connect", joinRoom);

      socket.on("joined_room", (payload: unknown) => {
        const typedPayload = payload as { room_id?: string } | undefined;
        if (disposed || typedPayload?.room_id !== currentRoomId) return;
        setCaseSocketReady(true);
      });

      socket.on("new_message", (payload: unknown) => {
        const message = payload as RequestChatMessage | undefined;
        if (!message?.id || !message.room_id) return;

        void queryClient.invalidateQueries({
          queryKey: ["patient-chat", CASE_ROOM_METADATA_QUERY_KEY],
        });

        if (message.room_id !== currentRoomId) return;

        queryClient.setQueryData<RequestChatMessage[]>(
          activeCaseMessagesQueryKey,
          (current = []) =>
            current.some((currentMessage) => currentMessage.id === message.id)
              ? current
              : [...current, message]
        );
      });

      socket.on("chat_unread_updated", () => {
        void queryClient.invalidateQueries({
          queryKey: ["patient-chat", CASE_ROOM_METADATA_QUERY_KEY],
        });
        void queryClient.invalidateQueries({
          queryKey: ["chat", "unread-chat-total"],
        });
      });

      if (socket.connected) {
        joinRoom();
      }
    });

    return () => {
      disposed = true;
      setCaseSocketReady(false);
      currentSocket?.disconnect();
      if (socketRef.current === currentSocket) {
        socketRef.current = null;
      }
    };
  }, [accessToken, activeCaseId, activeCaseMessagesQueryKey, currentRoomId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [caseMessagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!messageText.trim()) {
        throw new Error(tChatPage("emptyMessage"));
      }

      if (!activeCaseEntry?.isOpen) {
        throw new Error(tChatPage("requestClosedNotice"));
      }

      if (!caseSocketReady || !socketRef.current || !currentRoomId) {
        throw new Error(tChatPage("chatConnecting"));
      }

      socketRef.current.emit("send_message", {
        room_id: currentRoomId,
        content: messageText.trim(),
      });
    },
    onSuccess: async () => {
      setMessageText("");
      await queryClient.invalidateQueries({
        queryKey: ["patient-chat", CASE_ROOM_METADATA_QUERY_KEY],
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : tCommon("error")),
  });

  const handleShareLocation = useCallback(async () => {
    if (isSharingLocation) return;

    if (!activeCaseEntry?.isOpen) {
      toast.error(tChatPage("requestClosedNotice"));
      return;
    }

    if (!caseSocketReady || !socketRef.current || !currentRoomId) {
      toast.error(tChatPage("chatConnecting"));
      return;
    }

    setIsSharingLocation(true);

    try {
      const reading = await shareLocationWithBestAccuracy({
        durationMs: 8000,
        targetAccuracy: 15,
        timeoutMs: 15000,
      });

      const accuracyMeters = Math.round(reading.accuracy);
      const content = formatLocationMessage(
        reading.latitude,
        reading.longitude,
        tChatPage("chatLocationMessagePrefix"),
      );

      socketRef.current.emit("send_message", {
        room_id: currentRoomId,
        content,
      });

      if (accuracyMeters > 100) {
        toast.warning(
          tChatPage("chatLocationLowAccuracy", { meters: accuracyMeters }),
        );
      } else {
        toast.success(
          tChatPage("chatLocationSentWithAccuracy", { meters: accuracyMeters }),
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["patient-chat", CASE_ROOM_METADATA_QUERY_KEY],
      });
    } catch (error) {
      if (error instanceof ShareLocationError) {
        if (error.code === "UNSUPPORTED") {
          toast.error(tChatPage("chatLocationNotSupported"));
        } else if (error.code === "PERMISSION_DENIED") {
          toast.error(tChatPage("chatLocationPermissionDenied"));
        } else {
          toast.error(tChatPage("chatLocationFailed"));
        }
      } else {
        toast.error(tChatPage("chatLocationFailed"));
      }
    } finally {
      setIsSharingLocation(false);
    }
  }, [
    activeCaseEntry,
    caseSocketReady,
    currentRoomId,
    isSharingLocation,
    queryClient,
    tChatPage,
  ]);

  const caseMessages = caseMessagesQuery.data || [];
  const hasInboxEntries = caseInboxEntries.length > 0;
  const isInitialLoading = casesQuery.isLoading && !casesQuery.data;
  const activeThreadLoading =
    Boolean(activeCaseId) && caseMessagesQuery.isLoading && !caseMessages.length;
  const activeThreadError = activeCaseId ? caseMessagesQuery.error : null;
  const canSendMessage =
    Boolean(activeCaseEntry?.isOpen)
    && Boolean(currentRoomId)
    && caseSocketReady;

  if (isInitialLoading) {
    return (
      <AppPreloader
        variant="page"
        title={tNav("chat")}
        description={tChatPage("requestRoomsDescription")}
        blockCount={4}
      />
    );
  }

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <Card className="hidden rounded-2xl border-border/70 shadow-sm md:block">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/10 text-primary"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {tNav("chat")}
            </Badge>
          </div>
          <div className={cn(isRtl && "text-right")}>
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
            {caseInboxEntries.map((entry) => {
              const isActive = activeCaseId === entry.caseItem.id;

              return (
                <button
                  key={entry.caseItem.id}
                  type="button"
                  onClick={() =>
                    openCaseThread(entry.caseItem.id, entry.preferredRoomId)
                  }
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left",
                    isActive
                      ? "border-primary bg-primary/5"
                      : entry.unreadCount > 0
                        ? "border-emerald-200/80 bg-emerald-50/50"
                        : "border-border/70 bg-background"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 font-semibold">{entry.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            entry.isOpen
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          )}
                        >
                          {entry.isOpen
                            ? tChatPage("roomOpen")
                            : tChatPage("roomClosed")}
                        </Badge>
                        {entry.unreadCount > 0 ? (
                          <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1">
                            {entry.unreadCount > 9 ? "9+" : entry.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tChatPage("requestNumber", {
                          id: entry.caseItem.id.slice(0, 8),
                        })}
                        {" - "}
                        {entry.subtitle}
                      </p>
                      <p
                        className={cn(
                          "mt-2 line-clamp-1 text-sm",
                          entry.unreadCount > 0
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {entry.preview}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      {formatRelativeTime(entry.lastActivityAt, locale)}
                    </div>
                  </div>
                </button>
              );
            })}

            {!hasInboxEntries ? (
              <div className="flex min-h-52 items-center justify-center">
                <div className="text-center">
                  <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-primary" />
                  <p className="text-sm font-semibold">
                    {tChatPage("noInboxThreads")}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex min-h-[38rem] flex-col overflow-hidden rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>
              {activeCaseRoom?.provider_name
                || activeCaseEntry?.title
                || tChatPage("providerFallback")}
            </CardTitle>
            <CardDescription>{tChatPage("requestThreadDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            {activeCaseEntry ? (
              <div className="mb-3 space-y-3">
                <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {activeCaseRoom?.service_name || activeCaseEntry.subtitle}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tChatPage("requestNumber", {
                          id: activeCaseEntry.caseItem.id.slice(0, 8),
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        activeCaseEntry.isOpen
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      )}
                    >
                      {activeCaseEntry.isOpen
                        ? tChatPage("roomOpen")
                        : tChatPage("roomClosed")}
                    </Badge>
                  </div>
                </div>

                {activeCaseEntry.rooms.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeCaseEntry.rooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          setCurrentRoomId(room.id);
                          setCaseSocketReady(false);
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                          currentRoomId === room.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70 bg-background hover:bg-muted/40"
                        )}
                      >
                        <span>
                          {room.service_name
                            || room.provider_name
                            || tChatPage("requestRoomLabel")}
                        </span>
                        {Number(room.unread_count || 0) > 0 ? (
                          <span
                            className={cn(
                              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold",
                              currentRoomId === room.id
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-red-500 text-white"
                            )}
                          >
                            {Number(room.unread_count || 0) > 9
                              ? "9+"
                              : Number(room.unread_count || 0)}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {!caseSocketReady && activeCaseEntry.isOpen ? (
                  <p className="text-xs text-muted-foreground">
                    {tChatPage("chatConnecting")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border p-3">
              {!activeCaseId ? (
                <p className="text-sm text-muted-foreground">
                  {tChatPage("selectThreadHint")}
                </p>
              ) : activeThreadLoading ? (
                <AppPreloader
                  variant="panel"
                  title={tCommon("loading")}
                  blockCount={2}
                  blockVariant="line"
                  className="min-h-[18rem]"
                />
              ) : activeThreadError ? (
                <div className="flex min-h-[18rem] items-center justify-center text-center">
                  <div>
                    <p className="text-sm text-destructive">{tCommon("error")}</p>
                  </div>
                </div>
              ) : caseMessages.length ? (
                caseMessages.map((message) => {
                  const mine = message.sender_role === "PATIENT";
                  const fileUrl =
                    casesApi.resolveMediaUrl(message.file_url || null)
                    || message.file_url
                    || null;
                  const locationInfo = extractLocationInfo(message.content);
                  const textContent = locationInfo
                    ? locationInfo.displayText
                    : message.content;
                  const preferApple = isAppleDevice();
                  const primaryMapUrl = preferApple
                    ? locationInfo?.appleMapsUrl
                    : locationInfo?.googleMapsUrl;
                  const primaryDirUrl = preferApple
                    ? locationInfo?.appleDirectionsUrl
                    : locationInfo?.googleDirectionsUrl;

                  return (
                    <div
                      key={message.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        {message.sender_role !== "PATIENT" && message.sender_name ? (
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {message.sender_name}
                          </p>
                        ) : null}
                        {textContent ? <p>{textContent}</p> : null}
                        {locationInfo ? (
                          <div
                            className={cn(
                              "mt-2 rounded-lg border px-3 py-2",
                              mine
                                ? "border-primary-foreground/20 bg-primary-foreground/10"
                                : "border-border/70 bg-background"
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
                                    : "border-border/70 bg-background hover:bg-muted"
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
                                    : "border-border/70 bg-background hover:bg-muted"
                                )}
                              >
                                <Navigation className="h-3 w-3" />
                                {tChatPage("getDirections")}
                              </a>
                            </div>
                          </div>
                        ) : null}
                        {fileUrl ? (
                          <ChatMediaLink
                            filePath={fileUrl}
                            fileName={message.file_name}
                            openLabel={tChatPage("openAttachment")}
                          />
                        ) : null}
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            mine
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatRelativeTime(message.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-[18rem] items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    {tChatPage("noMessages")}
                  </p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {activeCaseEntry && !activeCaseEntry.isOpen ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {tChatPage("requestClosedNotice")}
              </div>
            ) : activeCaseId ? (
              <form
                className="mt-3 flex flex-wrap items-center gap-2"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  sendMutation.mutate();
                }}
              >
                <Input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={tChatPage("typeMessage")}
                  className="min-w-[12rem] flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareLocation}
                  disabled={isSharingLocation || !canSendMessage}
                  title={tChatPage("shareLocation")}
                >
                  <MapPin className="h-4 w-4" />
                  {isSharingLocation
                    ? tChatPage("sharing")
                    : tChatPage("shareLocation")}
                </Button>
                <Button type="submit" disabled={sendMutation.isPending || !canSendMessage}>
                  <Send className="h-4 w-4" />
                  {tChatPage("send")}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
