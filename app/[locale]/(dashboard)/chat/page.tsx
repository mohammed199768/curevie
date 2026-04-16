"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { MessageSquareText, Paperclip, Send, ShieldCheck } from "lucide-react";
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
import { chatApi } from "@/lib/api/chat";
import type { Conversation, Message, RequestChatMessage, RequestStatus } from "@/lib/api/types";
import { connectAppSocket, type AppSocket } from "@/lib/socket-client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { translateEnumValue } from "@/lib/i18n";
import { cn, formatRelativeTime, normalizeListResponse } from "@/lib/utils";

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

type InboxThread =
  | { kind: "admin"; id: string }
  | { kind: "case"; id: string };

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

function getConversationPreview(
  conversation: Conversation,
  attachmentLabel: string,
  emptyLabel: string
) {
  const body = conversation.last_message?.body?.trim();
  if (body) return body;
  if (conversation.last_message?.media_url) return attachmentLabel;
  return emptyLabel;
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

  const [activeThread, setActiveThread] = useState<InboxThread | null>(null);
  const [caseSocketReady, setCaseSocketReady] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<AppSocket | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: async () => (await chatApi.getConversations()).data.data,
    enabled: Boolean(accessToken),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const casesQuery = useQuery({
    queryKey: ["patient-chat", "cases"],
    queryFn: async () => (await casesApi.list({ limit: 100 })).data.data,
    enabled: Boolean(accessToken),
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const conversations = useMemo(
    () =>
      (conversationsQuery.data || []).filter(
        (conversation) => conversation.participant_role === "ADMIN"
      ),
    [conversationsQuery.data]
  );

  const sortedAdminConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const unreadDelta =
          Number(b.unread_count || 0) - Number(a.unread_count || 0);
        if (unreadDelta !== 0) return unreadDelta;

        return (
          toTimeValue(b.last_message_at || b.created_at)
          - toTimeValue(a.last_message_at || a.created_at)
        );
      }),
    [conversations]
  );

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

  const activeConversation = useMemo(
    () =>
      activeThread?.kind === "admin"
        ? sortedAdminConversations.find(
            (conversation) => conversation.id === activeThread.id
          ) || null
        : null,
    [activeThread, sortedAdminConversations]
  );

  const activeCaseEntry = useMemo(
    () =>
      activeThread?.kind === "case"
        ? caseInboxEntries.find((entry) => entry.caseItem.id === activeThread.id) || null
        : null,
    [activeThread, caseInboxEntries]
  );

  const activeCaseRoom = useMemo(() => {
    if (!activeCaseEntry) return null;

    return (
      activeCaseEntry.rooms.find((room) => room.id === currentRoomId)
      || selectPreferredRoom(activeCaseEntry.rooms)
      || null
    );
  }, [activeCaseEntry, currentRoomId]);

  const openConversationThread = useCallback(
    async (conversationId: string) => {
      setActiveThread({ kind: "admin", id: conversationId });
      setCaseSocketReady(false);
      setCurrentRoomId("");
      setFile(null);
      setMessageText("");

      try {
        await chatApi.markRead(conversationId);
        await queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
        await queryClient.invalidateQueries({ queryKey: ["chat", "unread-count"] });
      } catch {}
    },
    [queryClient]
  );

  const openCaseThread = useCallback((caseId: string, roomId?: string | null) => {
    setActiveThread({ kind: "case", id: caseId });
    setCaseSocketReady(false);
    setCurrentRoomId(roomId || "");
    setFile(null);
    setMessageText("");
  }, []);

  useEffect(() => {
    if (activeThread?.kind !== "case") return;
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
  }, [activeCaseEntry, activeThread, currentRoomId]);

  useEffect(() => {
    if (activeThread?.kind === "admin" && activeConversation) return;
    if (activeThread?.kind === "case" && activeCaseEntry) return;

    if (sortedAdminConversations.length) {
      void openConversationThread(sortedAdminConversations[0].id);
      return;
    }

    if (caseInboxEntries.length) {
      openCaseThread(
        caseInboxEntries[0].caseItem.id,
        caseInboxEntries[0].preferredRoomId
      );
      return;
    }

    if (activeThread) {
      setActiveThread(null);
    }
  }, [
    activeCaseEntry,
    activeConversation,
    activeThread,
    caseInboxEntries,
    openCaseThread,
    openConversationThread,
    sortedAdminConversations,
  ]);

  const adminMessagesQuery = useQuery({
    queryKey: ["chat", activeConversation?.id, "messages"],
    queryFn: async () =>
      normalizeListResponse<Message>(
        (await chatApi.getMessages(activeConversation!.id, { page: 1, limit: 50 }))
          .data
      ).data,
    enabled: Boolean(activeConversation?.id),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const activeCaseId = activeCaseEntry?.caseItem.id || null;
  const activeCaseMessagesQueryKey = [
    "patient-chat",
    activeCaseId,
    currentRoomId,
    "messages",
  ] as const;

  const caseMessagesQuery = useQuery({
    queryKey: activeCaseMessagesQueryKey,
    queryFn: async () =>
      (await casesApi.getChatMessages(currentRoomId, { limit: 50 })).data
        .data as RequestChatMessage[],
    enabled: Boolean(activeCaseId && currentRoomId),
    retry: shouldRetryChatQuery,
  });

  useEffect(() => {
    if (activeThread?.kind !== "case" || !currentRoomId || !accessToken) {
      setCaseSocketReady(false);
      return undefined;
    }

    let disposed = false;
    let currentSocket: AppSocket | null = null;

    setCaseSocketReady(false);

    void connectAppSocket(accessToken).then((socket) => {
      if (disposed || !socket) return;

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
      });

      if (socket.connected) {
        joinRoom();
      }
    });

    return () => {
      disposed = true;
      setCaseSocketReady(false);
      currentSocket?.disconnect();
      socketRef.current = null;
    };
  }, [
    accessToken,
    activeCaseMessagesQueryKey,
    activeThread,
    currentRoomId,
    queryClient,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, adminMessagesQuery.data, caseMessagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if ((!messageText.trim() && !file) || !activeThread) {
        throw new Error(tChatPage("emptyMessage"));
      }

      if (activeThread.kind === "admin") {
        await chatApi.sendMessage(activeThread.id, {
          body: messageText.trim() || undefined,
          file: file || undefined,
        });
        return;
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
      setFile(null);

      if (activeThread?.kind === "admin") {
        await queryClient.invalidateQueries({
          queryKey: ["chat", activeThread.id, "messages"],
        });
        await queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
        return;
      }

      if (activeThread?.kind === "case") {
        await queryClient.invalidateQueries({
          queryKey: ["patient-chat", CASE_ROOM_METADATA_QUERY_KEY],
        });
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : tCommon("error")),
  });

  const adminMessages = adminMessagesQuery.data || [];
  const caseMessages = caseMessagesQuery.data || [];
  const caseThreadActive =
    activeThread?.kind === "case" && Boolean(activeCaseEntry);
  const adminThreadActive =
    activeThread?.kind === "admin" && Boolean(activeConversation);
  const activeThreadLoading = caseThreadActive
    ? caseMessagesQuery.isLoading && !caseMessages.length
    : adminThreadActive
      ? adminMessagesQuery.isLoading && !adminMessages.length
      : false;
  const activeThreadError = caseThreadActive
    ? caseMessagesQuery.error
    : adminThreadActive
      ? adminMessagesQuery.error
      : null;
  const canSendMessage =
    (activeThread?.kind === "admin" && Boolean(activeConversation))
    || (
      activeThread?.kind === "case"
      && Boolean(activeCaseEntry?.isOpen)
      && Boolean(currentRoomId)
      && caseSocketReady
    );
  const hasInboxEntries = Boolean(
    sortedAdminConversations.length || caseInboxEntries.length
  );
  const isInitialLoading =
    (conversationsQuery.isLoading && !conversationsQuery.data)
    || (casesQuery.isLoading && !casesQuery.data);

  if (isInitialLoading) {
    return (
      <AppPreloader
        variant="page"
        title={tNav("chat")}
        description={tChatPage("adminOnlyDescription")}
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
              {tChatPage("adminOnlyBadge")}
            </Badge>
          </div>
          <div className={cn(isRtl && "text-right")}>
            <CardTitle>{tNav("chat")}</CardTitle>
            <CardDescription>{tChatPage("adminOnlyDescription")}</CardDescription>
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
            {sortedAdminConversations.map((conversation) => {
              const unreadCount = Number(conversation.unread_count || 0);
              const isActive =
                activeThread?.kind === "admin" && activeThread.id === conversation.id;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void openConversationThread(conversation.id)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border/70 bg-background",
                    unreadCount > 0 && !isActive && "border-emerald-200/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 font-semibold">
                          {conversation.participant_name || tChatPage("adminLabel")}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-primary/15 bg-primary/10 text-primary"
                        >
                          {tChatPage("systemChip")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tChatPage("adminThreadSubtitle")}
                      </p>
                      <p
                        className={cn(
                          "mt-2 line-clamp-1 text-sm",
                          unreadCount > 0
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {getConversationPreview(
                          conversation,
                          tChatPage("attachmentPreview"),
                          tChatPage("noMessages")
                        )}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      {conversation.last_message_at
                        ? formatRelativeTime(conversation.last_message_at, locale)
                        : "-"}
                    </div>
                  </div>
                </button>
              );
            })}

            {caseInboxEntries.map((entry) => {
              const isActive =
                activeThread?.kind === "case" && activeThread.id === entry.caseItem.id;

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
              {caseThreadActive
                ? activeCaseRoom?.provider_name
                  || activeCaseEntry?.title
                  || tChatPage("providerFallback")
                : activeConversation?.participant_name || tChatPage("adminLabel")}
            </CardTitle>
            <CardDescription>
              {caseThreadActive
                ? tChatPage("requestThreadDescription")
                : tChatPage("adminThreadDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            {caseThreadActive && activeCaseEntry ? (
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
              {!activeThread ? (
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
              ) : caseThreadActive ? (
                caseMessages.length ? (
                  caseMessages.map((message) => {
                    const mine = message.sender_role === "PATIENT";
                    const fileUrl =
                      casesApi.resolveMediaUrl(message.file_url || null)
                      || message.file_url
                      || null;

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
                          {message.content ? <p>{message.content}</p> : null}
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
                )
              ) : adminMessages.length ? (
                adminMessages.map((message) => {
                  const mine = message.sender_role === "PATIENT";

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
                        {message.body ? <p>{message.body}</p> : null}
                        {message.media_url ? (
                          <ChatMediaLink
                            filePath={message.media_url}
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

            {caseThreadActive && activeCaseEntry && !activeCaseEntry.isOpen ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {tChatPage("requestClosedNotice")}
              </div>
            ) : activeThread ? (
              <>
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
                  {activeThread.kind === "admin" ? (
                    <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4" />
                      {tChatPage("file")}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                      />
                    </label>
                  ) : null}
                  <Button type="submit" disabled={sendMutation.isPending || !canSendMessage}>
                    <Send className="h-4 w-4" />
                    {tChatPage("send")}
                  </Button>
                </form>
                {file ? (
                  <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
