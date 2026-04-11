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
import { chatApi } from "@/lib/api/chat";
import { requestsApi } from "@/lib/api/requests";
import type { Conversation, Message, RequestChatMessage, RequestItem, RequestStatus } from "@/lib/api/types";
import { markRequestChatSeen, readRequestChatLastSeenMap } from "@/lib/request-chat-read-state";
import { translateEnumValue } from "@/lib/i18n";
import { cn, formatRelativeTime, normalizeListResponse } from "@/lib/utils";

const REQUEST_ROOM_STATUSES = new Set<RequestStatus>(["IN_PROGRESS", "COMPLETED", "CLOSED"]);
const REQUEST_ROOM_ACTIVE_STATUSES = new Set<RequestStatus>(["IN_PROGRESS", "COMPLETED"]);
const REQUEST_ROOM_TYPE = "PROVIDER_PATIENT";

type InboxThread = { kind: "admin"; id: string } | { kind: "request"; id: string };
type RequestRoomEntry = {
  request: RequestItem;
  hasUnread: boolean;
  isOpen: boolean;
  lastActivityAt: string;
  preview: string;
  subtitle: string;
};

function shouldRetryChatQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 429) return false;
  return failureCount < 1;
}
function toTimeValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}
function getRequestRoomTimestamp(request: RequestItem) {
  return request.closed_at || request.completed_at || request.in_progress_at || request.updated_at || request.created_at;
}
function getConversationPreview(conversation: Conversation, attachmentLabel: string, emptyLabel: string) {
  const body = conversation.last_message?.body?.trim();
  if (body) return body;
  if (conversation.last_message?.media_url) return attachmentLabel;
  return emptyLabel;
}
function getRequestRoomPreview(message: RequestChatMessage | null, attachmentLabel: string, emptyLabel: string) {
  const content = message?.content?.trim();
  if (content) return content;
  if (message?.file_name?.trim()) return message.file_name.trim();
  if (message?.file_url) return attachmentLabel;
  return emptyLabel;
}

function ChatMediaLink({ filePath, fileName, requestId, openLabel }: { filePath: string; fileName?: string | null; requestId?: string | null; openLabel: string }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!filePath) {
      setHref(null);
      return;
    }
    if (filePath.startsWith("http") || filePath.startsWith("/uploads/")) {
      setHref(filePath);
      return;
    }
    if (!requestId) {
      setHref(null);
      return;
    }
    void requestsApi.getSecureChatMediaUrl(filePath, requestId).then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [filePath, requestId]);

  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline underline-offset-4">
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
  const queryClient = useQueryClient();

  const [activeThread, setActiveThread] = useState<InboxThread | null>(null);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [requestRoomSeenMap, setRequestRoomSeenMap] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRequestRoomSeenMap(readRequestChatLastSeenMap());
  }, []);

  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: async () => (await chatApi.getConversations()).data.data,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const requestRoomsQuery = useQuery({
    queryKey: ["patient-chat", "request-rooms"],
    queryFn: async () => normalizeListResponse<RequestItem>((await requestsApi.list({ page: 1, limit: 100 })).data).data,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const conversations = useMemo(
    () => (conversationsQuery.data || []).filter((conversation) => conversation.participant_role === "ADMIN"),
    [conversationsQuery.data],
  );

  const sortedAdminConversations = useMemo(
    () => [...conversations].sort((a, b) => {
      const unreadDelta = Number(b.unread_count || 0) - Number(a.unread_count || 0);
      if (unreadDelta !== 0) return unreadDelta;
      return toTimeValue(b.last_message_at || b.created_at) - toTimeValue(a.last_message_at || a.created_at);
    }),
    [conversations],
  );

  const requestRooms = useMemo(() => {
    const rows = requestRoomsQuery.data || [];
    return rows.filter((request) => REQUEST_ROOM_STATUSES.has(request.status) && (request.provider_name || request.assigned_provider_id));
  }, [requestRoomsQuery.data]);

  const requestRoomMetadataQuery = useQuery({
    queryKey: ["patient-chat", "request-room-metadata", requestRooms.map((request) => request.id).join(",")],
    enabled: requestRooms.length > 0,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
    queryFn: async () => {
      const entries = await Promise.all(requestRooms.map(async (request) => {
        try {
          const response = await requestsApi.listChatMessages(request.id, REQUEST_ROOM_TYPE, { page: 1, limit: 20 });
          const rawMessages = response.data.data;
          const messages: RequestChatMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
          const latestMessage = messages[messages.length - 1] || null;
          const lastExternalMessage = [...messages].reverse().find((message) => message.sender_role !== "PATIENT") || null;
          return [request.id, { latestMessage, lastActivityAt: latestMessage?.created_at || getRequestRoomTimestamp(request), lastExternalMessageAt: lastExternalMessage?.created_at || null }] as const;
        } catch {
          return [request.id, { latestMessage: null, lastActivityAt: getRequestRoomTimestamp(request), lastExternalMessageAt: null }] as const;
        }
      }));
      return Object.fromEntries(entries);
    },
  });

  const requestRoomEntries = useMemo(
    () => [...requestRooms].map((request) => {
      const metadata = requestRoomMetadataQuery.data?.[request.id];
      const lastSeenAt = requestRoomSeenMap[request.id];
      const lastExternalMessageAt = metadata?.lastExternalMessageAt || null;
      return {
        request,
        hasUnread: Boolean(lastExternalMessageAt) && (!lastSeenAt || toTimeValue(lastExternalMessageAt) > toTimeValue(lastSeenAt)),
        isOpen: REQUEST_ROOM_ACTIVE_STATUSES.has(request.status),
        lastActivityAt: metadata?.lastActivityAt || getRequestRoomTimestamp(request),
        preview: getRequestRoomPreview(metadata?.latestMessage || null, tChatPage("attachmentPreview"), tChatPage("noMessages")),
        subtitle: request.service_name || translateEnumValue(request.service_type, tEnums) || tChatPage("requestRoomLabel"),
      } satisfies RequestRoomEntry;
    }).sort((a, b) => a.isOpen !== b.isOpen ? (a.isOpen ? -1 : 1) : toTimeValue(b.lastActivityAt) - toTimeValue(a.lastActivityAt)),
    [requestRoomMetadataQuery.data, requestRoomSeenMap, requestRooms, tChatPage, tEnums],
  );

  const activeConversation = useMemo(
    () => activeThread?.kind === "admin" ? sortedAdminConversations.find((conversation) => conversation.id === activeThread.id) || null : null,
    [activeThread, sortedAdminConversations],
  );
  const activeRequestRoomEntry = useMemo(
    () => activeThread?.kind === "request" ? requestRoomEntries.find((entry) => entry.request.id === activeThread.id) || null : null,
    [activeThread, requestRoomEntries],
  );

  const openConversationThread = useCallback(async (conversationId: string) => {
    setActiveThread({ kind: "admin", id: conversationId });
    setMessageText("");
    setFile(null);
    try {
      await chatApi.markRead(conversationId);
      await queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["chat", "unread-count"] });
    } catch {}
  }, [queryClient]);

  const openRequestThread = useCallback((requestId: string, seenAt?: string | null) => {
    const resolvedSeenAt = seenAt || new Date().toISOString();
    markRequestChatSeen(requestId, resolvedSeenAt);
    setRequestRoomSeenMap((current) => ({ ...current, [requestId]: resolvedSeenAt }));
    setActiveThread({ kind: "request", id: requestId });
    setMessageText("");
    setFile(null);
  }, []);

  useEffect(() => {
    if (activeThread?.kind === "admin" && activeConversation) return;
    if (activeThread?.kind === "request" && activeRequestRoomEntry) return;
    if (sortedAdminConversations.length) {
      void openConversationThread(sortedAdminConversations[0].id);
      return;
    }
    if (requestRoomEntries.length) {
      openRequestThread(requestRoomEntries[0].request.id, requestRoomEntries[0].lastActivityAt);
      return;
    }
    if (activeThread) setActiveThread(null);
  }, [activeConversation, activeRequestRoomEntry, activeThread, openConversationThread, openRequestThread, requestRoomEntries, sortedAdminConversations]);

  const adminMessagesQuery = useQuery({
    queryKey: ["chat", activeConversation?.id, "messages"],
    queryFn: async () => normalizeListResponse<Message>((await chatApi.getMessages(activeConversation!.id, { page: 1, limit: 50 })).data).data,
    enabled: Boolean(activeConversation?.id),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  const requestMessagesQuery = useQuery({
    queryKey: ["patient-chat", activeRequestRoomEntry?.request.id, "messages"],
    queryFn: async () => {
      const response = await requestsApi.listChatMessages(activeRequestRoomEntry!.request.id, REQUEST_ROOM_TYPE, { page: 1, limit: 50 });
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
    enabled: Boolean(activeRequestRoomEntry?.request.id),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryChatQuery,
  });

  useEffect(() => {
    const latestExternalMessage = [...(requestMessagesQuery.data || [])].reverse().find((message) => message.sender_role !== "PATIENT");
    if (!activeRequestRoomEntry?.request.id || !latestExternalMessage?.created_at) return;
    markRequestChatSeen(activeRequestRoomEntry.request.id, latestExternalMessage.created_at);
    setRequestRoomSeenMap((current) => current[activeRequestRoomEntry.request.id] === latestExternalMessage.created_at ? current : { ...current, [activeRequestRoomEntry.request.id]: latestExternalMessage.created_at });
  }, [activeRequestRoomEntry, requestMessagesQuery.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, adminMessagesQuery.data, requestMessagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if ((!messageText.trim() && !file) || !activeThread) throw new Error(tChatPage("emptyMessage"));
      if (activeThread.kind === "admin") {
        await chatApi.sendMessage(activeThread.id, { body: messageText.trim() || undefined, file: file || undefined });
        return;
      }
      if (!activeRequestRoomEntry?.isOpen) throw new Error(tChatPage("requestClosedNotice"));
      await requestsApi.sendChatMessage(activeThread.id, REQUEST_ROOM_TYPE, { body: messageText.trim() || undefined, file: file || undefined });
    },
    onSuccess: async () => {
      setMessageText("");
      setFile(null);
      if (activeThread?.kind === "admin") {
        await queryClient.invalidateQueries({ queryKey: ["chat", activeThread.id, "messages"] });
        await queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
        return;
      }
      if (activeThread?.kind === "request") {
        await queryClient.invalidateQueries({ queryKey: ["patient-chat", activeThread.id, "messages"] });
        await queryClient.invalidateQueries({ queryKey: ["patient-chat", "request-room-metadata"] });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : tCommon("error")),
  });

  const adminMessages = adminMessagesQuery.data || [];
  const requestMessages = requestMessagesQuery.data || [];
  const requestThreadActive = activeThread?.kind === "request" && Boolean(activeRequestRoomEntry);
  const adminThreadActive = activeThread?.kind === "admin" && Boolean(activeConversation);
  const activeThreadLoading = requestThreadActive ? requestMessagesQuery.isLoading && !requestMessages.length : adminThreadActive ? adminMessagesQuery.isLoading && !adminMessages.length : false;
  const activeThreadError = requestThreadActive ? requestMessagesQuery.error : adminThreadActive ? adminMessagesQuery.error : null;
  const canSendMessage = (activeThread?.kind === "admin" && Boolean(activeConversation)) || (activeThread?.kind === "request" && Boolean(activeRequestRoomEntry?.isOpen));
  const isInitialLoading = (conversationsQuery.isLoading && !conversationsQuery.data) || (requestRoomsQuery.isLoading && !requestRoomsQuery.data);
  const hasInboxEntries = Boolean(sortedAdminConversations.length || requestRoomEntries.length);

  if (isInitialLoading) return <AppPreloader variant="page" title={tNav("chat")} description={tChatPage("adminOnlyDescription")} blockCount={4} />;

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <Card className="hidden rounded-2xl border-border/70 shadow-sm md:block">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary"><ShieldCheck className="h-3.5 w-3.5" />{tChatPage("adminOnlyBadge")}</Badge>
          </div>
          <div className={cn(isRtl && "text-right")}>
            <CardTitle>{tNav("chat")}</CardTitle>
            <CardDescription>{tChatPage("adminOnlyDescription")}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="flex min-h-[30rem] flex-col overflow-hidden rounded-2xl shadow-lg">
          <CardHeader><CardTitle>{tChatPage("inboxTitle")}</CardTitle><CardDescription>{tChatPage("inboxDescription")}</CardDescription></CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {sortedAdminConversations.map((conversation) => {
              const unreadCount = Number(conversation.unread_count || 0);
              const isActive = activeThread?.kind === "admin" && activeThread.id === conversation.id;
              return (
                <button key={conversation.id} type="button" onClick={() => void openConversationThread(conversation.id)} className={cn("w-full rounded-xl border px-4 py-3 text-left", isActive ? "border-primary bg-primary/5" : "border-border/70 bg-background", unreadCount > 0 && !isActive && "border-emerald-200/80")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 font-semibold">{conversation.participant_name || tChatPage("adminLabel")}</p>
                        <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">{tChatPage("systemChip")}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{tChatPage("adminThreadSubtitle")}</p>
                      <p className={cn("mt-2 line-clamp-1 text-sm", unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>{getConversationPreview(conversation, tChatPage("attachmentPreview"), tChatPage("noMessages"))}</p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">{conversation.last_message_at ? formatRelativeTime(conversation.last_message_at, locale) : "-"}</div>
                  </div>
                </button>
              );
            })}

            {requestRoomEntries.map((entry) => {
              const isActive = activeThread?.kind === "request" && activeThread.id === entry.request.id;
              return (
                <button key={entry.request.id} type="button" onClick={() => openRequestThread(entry.request.id, entry.lastActivityAt)} className={cn("w-full rounded-xl border px-4 py-3 text-left", isActive ? "border-primary bg-primary/5" : entry.hasUnread ? "border-emerald-200/80 bg-emerald-50/50" : "border-border/70 bg-background")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-1 font-semibold">{entry.request.provider_name || tChatPage("providerFallback")}</p>
                        <Badge variant="outline" className={cn(entry.isOpen ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-700")}>{entry.isOpen ? tChatPage("roomOpen") : tChatPage("roomClosed")}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{tChatPage("requestNumber", { id: entry.request.id.slice(0, 8) })}{" - "}{entry.subtitle}</p>
                      <p className={cn("mt-2 line-clamp-1 text-sm", entry.hasUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>{entry.preview}</p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">{formatRelativeTime(entry.lastActivityAt, locale)}</div>
                  </div>
                </button>
              );
            })}

            {!hasInboxEntries ? <div className="flex min-h-52 items-center justify-center"><div className="text-center"><MessageSquareText className="mx-auto mb-3 h-9 w-9 text-primary" /><p className="text-sm font-semibold">{tChatPage("noInboxThreads")}</p></div></div> : null}
          </CardContent>
        </Card>

        <Card className="flex min-h-[38rem] flex-col overflow-hidden rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>{requestThreadActive ? activeRequestRoomEntry?.request.provider_name || tChatPage("providerFallback") : activeConversation?.participant_name || tChatPage("adminLabel")}</CardTitle>
            <CardDescription>{requestThreadActive ? tChatPage("requestThreadDescription") : tChatPage("adminThreadDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border p-3">
              {!activeThread ? <p className="text-sm text-muted-foreground">{tChatPage("selectThreadHint")}</p> : activeThreadLoading ? <AppPreloader variant="panel" title={tCommon("loading")} blockCount={2} blockVariant="line" className="min-h-[18rem]" /> : activeThreadError ? (
                <div className="flex min-h-[18rem] items-center justify-center text-center"><div><p className="text-sm text-destructive">{tCommon("error")}</p></div></div>
              ) : requestThreadActive ? (
                requestMessages.length ? requestMessages.map((message) => {
                  const mine = message.sender_role === "PATIENT";
                  return (
                    <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {message.sender_role !== "PATIENT" && message.sender_name ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{message.sender_name}</p> : null}
                        {message.content ? <p>{message.content}</p> : null}
                        {message.file_url ? <ChatMediaLink filePath={message.file_url} fileName={message.file_name} requestId={activeRequestRoomEntry?.request.id} openLabel={tChatPage("openAttachment")} /> : null}
                        <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>{formatRelativeTime(message.created_at, locale)}</p>
                      </div>
                    </div>
                  );
                }) : <div className="flex min-h-[18rem] items-center justify-center"><p className="text-sm text-muted-foreground">{tChatPage("noMessages")}</p></div>
              ) : adminMessages.length ? adminMessages.map((message) => {
                const mine = message.sender_role === "PATIENT";
                return (
                  <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {message.body ? <p>{message.body}</p> : null}
                      {message.media_url ? <ChatMediaLink filePath={message.media_url} openLabel={tChatPage("openAttachment")} /> : null}
                      <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>{formatRelativeTime(message.created_at, locale)}</p>
                    </div>
                  </div>
                );
              }) : <div className="flex min-h-[18rem] items-center justify-center"><p className="text-sm text-muted-foreground">{tChatPage("noMessages")}</p></div>}
              <div ref={bottomRef} />
            </div>

            {requestThreadActive && activeRequestRoomEntry && !activeRequestRoomEntry.isOpen ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{tChatPage("requestClosedNotice")}</div> : activeThread ? (
              <>
                <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); sendMutation.mutate(); }}>
                  <Input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder={tChatPage("typeMessage")} className="min-w-[12rem] flex-1" />
                  <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
                    <Paperclip className="h-4 w-4" />
                    {tChatPage("file")}
                    <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>
                  <Button type="submit" disabled={sendMutation.isPending || !canSendMessage}>
                    <Send className="h-4 w-4" />
                    {tChatPage("send")}
                  </Button>
                </form>
                {file ? <p className="mt-1 text-xs text-muted-foreground">{file.name}</p> : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
