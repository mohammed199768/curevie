"use client";

import { memo, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, MapPin, MessageSquareText, Navigation, Paperclip, Send, ShieldCheck } from "lucide-react";
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
import { resolveMediaUrl } from "@/lib/utils/media-url";
import { cn, formatRelativeTime, normalizeListResponse } from "@/lib/utils";

const REQUEST_ROOM_STATUSES = new Set<RequestStatus>(["IN_PROGRESS", "COMPLETED", "CLOSED"]);
const REQUEST_ROOM_ACTIVE_STATUSES = new Set<RequestStatus>(["IN_PROGRESS", "COMPLETED"]);
const REQUEST_ROOM_TYPE = "PROVIDER_PATIENT";
const MESSAGES_PER_PAGE = 30;
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"]);

type RequestRoomMetadata = {
  requestId: string;
  latestMessage: RequestChatMessage | null;
  lastActivityAt: string;
  lastExternalMessageAt: string | null;
};

type InboxThread =
  | { kind: "admin"; id: string }
  | { kind: "request"; id: string };

type RequestRoomEntry = {
  request: RequestItem;
  hasUnread: boolean;
  isOpen: boolean;
  lastActivityAt: string;
  preview: string;
  subtitle: string;
};

type TranslationValues = Record<string, string | number>;
type TranslateFn = (key: string, values?: TranslationValues) => string;

function getRequestRoomTimestamp(request: RequestItem) {
  return request.closed_at || request.completed_at || request.in_progress_at || request.updated_at || request.created_at;
}

function toTimeValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
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

function buildLocationMessage(prefix: string, lat: number, lng: number) {
  return `${prefix} https://www.google.com/maps?q=${lat},${lng}`;
}

function extractLocationUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https:\/\/www\.google\.com\/maps\?q=[-\d.,]+/);
  return match ? match[0] : null;
}

function ChatLocationCard({
  mapsUrl,
  viewLabel,
  directionsLabel,
  sharedLabel,
}: {
  mapsUrl: string;
  viewLabel: string;
  directionsLabel: string;
  sharedLabel: string;
}) {
  const directionsUrl = mapsUrl.replace(
    "https://www.google.com/maps?q=",
    "https://www.google.com/maps/dir/?api=1&destination=",
  );

  return (
    <div className="mt-2 rounded-xl bg-white/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>{sharedLabel}</span>
      </div>
      <div className="flex gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/30"
        >
          <MapPin className="h-3 w-3" />
          {viewLabel}
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/30"
        >
          <Navigation className="h-3 w-3" />
          {directionsLabel}
        </a>
      </div>
    </div>
  );
}

function ChatMediaAttachment({
  url,
  fileName,
  openLabel,
}: {
  url: string;
  fileName?: string | null;
  openLabel: string;
}) {
  const urlExt = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  const nameExt = (fileName || "").split(".").pop()?.toLowerCase() || "";
  const isImage = IMAGE_EXTS.has(urlExt) || (!urlExt && IMAGE_EXTS.has(nameExt)) || IMAGE_EXTS.has(nameExt);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block">
        <img
          src={url}
          alt={fileName || "image"}
          className="max-h-48 max-w-full rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm hover:bg-background"
    >
      <Paperclip className="h-4 w-4 shrink-0" />
      <span className="line-clamp-1 flex-1">{fileName || openLabel}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

type ChatInboxPaneProps = {
  hasInboxEntries: boolean;
  isRtl: boolean;
  locale: string;
  requestRoomEntries: RequestRoomEntry[];
  selectedThread: InboxThread | null;
  sortedAdminConversations: Conversation[];
  tChatPage: TranslateFn;
  onSelectConversation: (conversationId: string) => void;
  onSelectRequestRoom: (requestId: string, seenAt?: string | null) => void;
};

const ChatInboxPane = memo(function ChatInboxPane({
  hasInboxEntries,
  isRtl,
  locale,
  requestRoomEntries,
  selectedThread,
  sortedAdminConversations,
  tChatPage,
  onSelectConversation,
  onSelectRequestRoom,
}: ChatInboxPaneProps) {
  return (
    <Card className="flex min-h-[30rem] flex-col overflow-hidden rounded-2xl shadow-lg xl:h-[calc(100vh-260px)]">
      <CardHeader className="space-y-4">
        <div className={cn(isRtl && "text-right")}>
          <CardTitle>{tChatPage("inboxTitle")}</CardTitle>
          <CardDescription>{tChatPage("inboxDescription")}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-hidden px-3 pb-3">
        <div className="h-full min-h-0 space-y-2 overflow-y-auto pr-1">
          {sortedAdminConversations.map((conversation) => {
            const isActive = selectedThread?.kind === "admin" && selectedThread.id === conversation.id;
            const unreadCount = Number(conversation.unread_count || 0);

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "group w-full rounded-[1.35rem] border px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/70 bg-background hover:border-primary/20 hover:bg-muted/30",
                  unreadCount > 0 && !isActive && "border-emerald-200/80",
                )}
              >
                <div className={cn("flex items-start justify-between gap-3", isRtl && "text-right")}>
                  <div className="min-w-0 flex-1">
                    <div className={cn("flex flex-wrap items-center gap-2", isRtl && "justify-end")}>
                      <p className="line-clamp-1 font-semibold">
                        {conversation.participant_name || tChatPage("adminLabel")}
                      </p>
                      <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
                        {tChatPage("systemChip")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tChatPage("adminThreadSubtitle")}</p>
                    <p className={cn("mt-2 line-clamp-1 text-sm", unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {getConversationPreview(conversation, tChatPage("attachmentPreview"), tChatPage("noMessages"))}
                    </p>
                  </div>

                  <div className={cn("flex shrink-0 flex-col gap-2", isRtl ? "items-start" : "items-end")}>
                    <span className={cn("text-[11px]", unreadCount > 0 ? "font-semibold text-emerald-700" : "text-muted-foreground")}>
                      {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at, locale) : "-"}
                    </span>
                    {unreadCount > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}

          {requestRoomEntries.map((entry) => {
            const isActive = selectedThread?.kind === "request" && selectedThread.id === entry.request.id;

            return (
              <button
                key={entry.request.id}
                type="button"
                onClick={() => onSelectRequestRoom(entry.request.id, entry.lastActivityAt)}
                className={cn(
                  "group block w-full rounded-[1.35rem] border px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : entry.hasUnread
                    ? "border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50"
                    : "border-border/70 bg-background hover:border-primary/20 hover:bg-muted/30",
                )}
              >
                <div className={cn("flex items-start justify-between gap-3", isRtl && "text-right")}>
                  <div className="min-w-0 flex-1">
                    <div className={cn("flex flex-wrap items-center gap-2", isRtl && "justify-end")}>
                      <p className="line-clamp-1 font-semibold">
                        {entry.request.provider_name || tChatPage("providerFallback")}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          entry.isOpen
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-slate-100 text-slate-700",
                        )}
                      >
                        {entry.isOpen ? tChatPage("roomOpen") : tChatPage("roomClosed")}
                      </Badge>
                      {entry.hasUnread ? (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                          {tChatPage("unreadBadge")}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {tChatPage("requestNumber", { id: entry.request.id.slice(0, 8) })}
                      {" - "}
                      {entry.subtitle}
                    </p>
                    <p className={cn("mt-2 line-clamp-1 text-sm", entry.hasUnread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {entry.preview}
                    </p>
                  </div>

                  <div className={cn("flex shrink-0 flex-col gap-2", isRtl ? "items-start" : "items-end")}>
                    <span className={cn("text-[11px]", entry.hasUnread ? "font-semibold text-emerald-700" : "text-muted-foreground")}>
                      {formatRelativeTime(entry.lastActivityAt, locale)}
                    </span>
                    <ArrowUpRight className={cn("h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground", isRtl && "scale-x-[-1]")} />
                  </div>
                </div>
              </button>
            );
          })}

          {!hasInboxEntries ? (
            <div className="flex h-full min-h-52 items-center justify-center">
              <div className="max-w-xs text-center">
                <MessageSquareText className="mx-auto mb-3 h-9 w-9 text-primary" />
                <p className="text-sm font-semibold">{tChatPage("noInboxThreads")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{tChatPage("inboxDescription")}</p>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});

type ChatThreadPaneProps = {
  activeConversation: Conversation | null;
  activeRequestRoomEntry: RequestRoomEntry | null;
  activeThread: InboxThread | null;
  activeThreadError: unknown;
  activeThreadLoading: boolean;
  adminMessages: Message[];
  adminPage: number;
  adminThreadActive: boolean;
  bottomAnchorRef: (node: HTMLDivElement | null) => void;
  canSendMessage: boolean;
  file: File | null;
  isRtl: boolean;
  isSharingLocation: boolean;
  locale: string;
  locationDirectionsLabel: string;
  locationSharedLabel: string;
  locationViewLabel: string;
  messageText: string;
  requestMessages: RequestChatMessage[];
  requestPage: number;
  requestThreadActive: boolean;
  sendPending: boolean;
  tChatPage: TranslateFn;
  tCommon: TranslateFn;
  onFileChange: (nextFile: File | null) => void;
  onLoadMoreAdmin: () => void;
  onLoadMoreRequest: () => void;
  onLocationShare: () => void;
  onMessageTextChange: (nextValue: string) => void;
  onRetry: () => void;
  onSubmit: () => void;
};

const ChatThreadPane = memo(function ChatThreadPane({
  activeConversation,
  activeRequestRoomEntry,
  activeThread,
  activeThreadError,
  activeThreadLoading,
  adminMessages,
  adminPage,
  adminThreadActive,
  bottomAnchorRef,
  canSendMessage,
  file,
  isRtl,
  isSharingLocation,
  locale,
  locationDirectionsLabel,
  locationSharedLabel,
  locationViewLabel,
  messageText,
  requestMessages,
  requestPage,
  requestThreadActive,
  sendPending,
  tChatPage,
  tCommon,
  onFileChange,
  onLoadMoreAdmin,
  onLoadMoreRequest,
  onLocationShare,
  onMessageTextChange,
  onRetry,
  onSubmit,
}: ChatThreadPaneProps) {
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  }, [onSubmit]);

  return (
    <Card className="flex min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-2xl shadow-lg xl:h-[calc(100vh-260px)]">
      <CardHeader className="space-y-3">
        <div className={cn("flex flex-wrap items-start justify-between gap-3", isRtl && "text-right")}>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1">
              {requestThreadActive
                ? activeRequestRoomEntry?.request.provider_name || tChatPage("providerFallback")
                : activeConversation?.participant_name || tChatPage("adminLabel")}
            </CardTitle>
            <CardDescription className="mt-1">
              {requestThreadActive ? tChatPage("requestThreadDescription") : tChatPage("adminThreadDescription")}
            </CardDescription>
          </div>

          {requestThreadActive && activeRequestRoomEntry ? (
            <div className={cn("flex flex-wrap items-center gap-2", isRtl && "justify-end")}>
              <Badge variant="outline" className="border-border/70 bg-background">
                {tChatPage("requestNumber", { id: activeRequestRoomEntry.request.id.slice(0, 8) })}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  activeRequestRoomEntry.isOpen
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                )}
              >
                {activeRequestRoomEntry.isOpen ? tChatPage("roomOpen") : tChatPage("roomClosed")}
              </Badge>
            </div>
          ) : null}
        </div>

        {requestThreadActive && activeRequestRoomEntry ? (
          <p className={cn("text-sm text-muted-foreground", isRtl && "text-right")}>
            {activeRequestRoomEntry.subtitle}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto rounded-xl border p-3">
          {!activeThread ? (
            <p className="text-sm text-muted-foreground">{tChatPage("selectThreadHint")}</p>
          ) : activeThreadLoading ? (
            <AppPreloader variant="panel" title={tCommon("loading")} blockCount={2} blockVariant="line" className="min-h-[18rem]" />
          ) : activeThreadError ? (
            <div className="flex min-h-[18rem] items-center justify-center text-center">
              <div>
                <p className="text-sm text-destructive">{tCommon("error")}</p>
                <Button variant="outline" className="mt-3" onClick={onRetry}>
                  {tCommon("retry")}
                </Button>
              </div>
            </div>
          ) : requestThreadActive ? (
            requestMessages.length ? (
              <>
                {requestPage * MESSAGES_PER_PAGE <= requestMessages.length ? (
                  <button
                    type="button"
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onLoadMoreRequest}
                  >
                    {tChatPage("loadMoreMessages")}
                  </button>
                ) : null}
                {requestMessages.map((message) => {
                  const mine = message.sender_role === "PATIENT";
                  const mediaUrl = resolveMediaUrl(message.file_url);

                  return (
                    <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] break-words rounded-xl px-3 py-2 text-sm sm:max-w-[75%]",
                          mine ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {message.sender_role !== "PATIENT" && message.sender_name ? (
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {message.sender_name}
                          </p>
                        ) : null}
                        {(() => {
                          const locationUrl = extractLocationUrl(message.content);
                          if (locationUrl) {
                            return (
                              <ChatLocationCard
                                mapsUrl={locationUrl}
                                sharedLabel={locationSharedLabel}
                                viewLabel={locationViewLabel}
                                directionsLabel={locationDirectionsLabel}
                              />
                            );
                          }
                          return message.content ? <p>{message.content}</p> : null;
                        })()}
                        {mediaUrl ? (
                          <ChatMediaAttachment
                            url={mediaUrl}
                            fileName={message.file_name}
                            openLabel={tChatPage("openAttachment")}
                          />
                        ) : null}
                        <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {formatRelativeTime(message.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex min-h-[18rem] items-center justify-center">
                <p className="text-sm text-muted-foreground">{tChatPage("noMessages")}</p>
              </div>
            )
          ) : adminMessages.length ? (
            <>
              {adminPage * MESSAGES_PER_PAGE <= adminMessages.length ? (
                <button
                  type="button"
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={onLoadMoreAdmin}
                >
                  {tChatPage("loadMoreMessages")}
                </button>
              ) : null}
              {adminMessages.map((message) => {
                const mine = message.sender_role === "PATIENT";
                const mediaUrl = resolveMediaUrl(message.media_url);

                return (
                  <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] break-words rounded-xl px-3 py-2 text-sm sm:max-w-[75%]",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {(() => {
                        const locationUrl = extractLocationUrl(message.body);
                        if (locationUrl) {
                          return (
                            <ChatLocationCard
                              mapsUrl={locationUrl}
                              sharedLabel={locationSharedLabel}
                              viewLabel={locationViewLabel}
                              directionsLabel={locationDirectionsLabel}
                            />
                          );
                        }
                        return message.body ? <p>{message.body}</p> : null;
                      })()}
                      {mediaUrl ? (
                        <ChatMediaAttachment
                          url={mediaUrl}
                          fileName={null}
                          openLabel={tChatPage("openAttachment")}
                        />
                      ) : null}
                      <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {formatRelativeTime(message.created_at, locale)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex min-h-[18rem] items-center justify-center">
              <p className="text-sm text-muted-foreground">{tChatPage("noMessages")}</p>
            </div>
          )}
          <div ref={bottomAnchorRef} />
        </div>

        {requestThreadActive && activeRequestRoomEntry && !activeRequestRoomEntry.isOpen ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {tChatPage("requestClosedNotice")}
          </div>
        ) : activeThread ? (
          <>
            <form className="mt-3 flex shrink-0 flex-wrap items-center gap-2" onSubmit={handleSubmit}>
              <Input
                value={messageText}
                onChange={(event) => onMessageTextChange(event.target.value)}
                placeholder={tChatPage("typeMessage")}
                className="min-w-[12rem] flex-1"
              />
              <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4" />
                {tChatPage("file")}
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => onFileChange(event.target.files?.[0] || null)}
                />
              </label>
              {(requestThreadActive && activeRequestRoomEntry?.isOpen) || adminThreadActive ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSharingLocation}
                  onClick={onLocationShare}
                >
                  <MapPin className="h-4 w-4" />
                  {isSharingLocation ? tChatPage("sharing") : tChatPage("shareLocation")}
                </Button>
              ) : null}
              <Button type="submit" disabled={sendPending || !canSendMessage}>
                <Send className="h-4 w-4" />
                {tChatPage("send")}
              </Button>
            </form>
            {file ? <p className="mt-1 text-xs text-muted-foreground">{file.name}</p> : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
});

export default function ChatPage() {
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const tNav = useTranslations("nav");
  const tChatPage = useTranslations("chatPage");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const locationLabels = isRtl
    ? { shared: "موقع مشترك", view: "عرض الموقع", directions: "الاتجاهات" }
    : { shared: "Shared location", view: "View location", directions: "Directions" };
  const queryClient = useQueryClient();
  const [activeThread, setActiveThread] = useState<InboxThread | null>(null);
  const [adminPage, setAdminPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [requestRoomSeenMap, setRequestRoomSeenMap] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const skipNextAutoScrollRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRequestRoomSeenMap(readRequestChatLastSeenMap());
  }, []);

  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: async () => (await chatApi.getConversations()).data.data,
    refetchInterval: 10_000,
  });

  const requestRoomsQuery = useQuery({
    queryKey: ["patient-chat", "request-rooms"],
    queryFn: async () =>
      normalizeListResponse<RequestItem>((await requestsApi.list({ page: 1, limit: 100 })).data).data,
    refetchInterval: 15_000,
  });

  const conversations = useMemo(
    () => (conversationsQuery.data || []).filter((conversation) => conversation.participant_role === "ADMIN"),
    [conversationsQuery.data],
  );

  const sortedAdminConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
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
    refetchInterval: 15_000,
    queryFn: async () => {
      const entries = await Promise.all(
        requestRooms.map(async (request) => {
          try {
            const response = await requestsApi.listChatMessages(request.id, REQUEST_ROOM_TYPE, { page: 1, limit: 20 });
            const rawMessages = response.data.data;
            const messages: RequestChatMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
            const latestMessage = messages[messages.length - 1] || null;
            const lastExternalMessage = [...messages].reverse().find((message) => message.sender_role !== "PATIENT") || null;

            return [
              request.id,
              {
                requestId: request.id,
                latestMessage,
                lastActivityAt: latestMessage?.created_at || getRequestRoomTimestamp(request),
                lastExternalMessageAt: lastExternalMessage?.created_at || null,
              } satisfies RequestRoomMetadata,
            ] as const;
          } catch {
            return [
              request.id,
              {
                requestId: request.id,
                latestMessage: null,
                lastActivityAt: getRequestRoomTimestamp(request),
                lastExternalMessageAt: null,
              } satisfies RequestRoomMetadata,
            ] as const;
          }
        }),
      );

      return Object.fromEntries(entries);
    },
  });

  const requestRoomEntries = useMemo(
    () =>
      [...requestRooms]
        .map((request) => {
          const metadata = requestRoomMetadataQuery.data?.[request.id];
          const lastSeenAt = requestRoomSeenMap[request.id];
          const lastExternalMessageAt = metadata?.lastExternalMessageAt || null;
          const hasUnread =
            Boolean(lastExternalMessageAt)
            && (!lastSeenAt || toTimeValue(lastExternalMessageAt) > toTimeValue(lastSeenAt));
          const lastActivityAt = metadata?.lastActivityAt || getRequestRoomTimestamp(request);

          return {
            request,
            hasUnread,
            isOpen: REQUEST_ROOM_ACTIVE_STATUSES.has(request.status),
            lastActivityAt,
            preview: getRequestRoomPreview(
              metadata?.latestMessage || null,
              tChatPage("attachmentPreview"),
              tChatPage("noMessages"),
            ),
            subtitle:
              request.service_name
              || translateEnumValue(request.service_type, tEnums)
              || tChatPage("requestRoomLabel"),
          } satisfies RequestRoomEntry;
        })
        .sort((a, b) => {
          if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
          return toTimeValue(b.lastActivityAt) - toTimeValue(a.lastActivityAt);
        }),
    [requestRoomMetadataQuery.data, requestRoomSeenMap, requestRooms, tChatPage, tEnums],
  );

  const activeConversation = useMemo(
    () =>
      activeThread?.kind === "admin"
        ? sortedAdminConversations.find((conversation) => conversation.id === activeThread.id) || null
        : null,
    [activeThread, sortedAdminConversations],
  );

  const activeRequestRoomEntry = useMemo(
    () =>
      activeThread?.kind === "request"
        ? requestRoomEntries.find((entry) => entry.request.id === activeThread.id) || null
        : null,
    [activeThread, requestRoomEntries],
  );

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    setActiveThread({ kind: "admin", id: conversationId });
    setAdminPage(1);
    setMessageText("");
    setFile(null);
    try {
      await chatApi.markRead(conversationId);
      await queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["chat", "unread-count"] });
    } catch {
      // Opening the conversation should not fail if the read-sync call fails.
    }
  }, [queryClient]);

  const handleSelectRequestRoom = useCallback((requestId: string, seenAt?: string | null) => {
    const resolvedSeenAt = seenAt || new Date().toISOString();
    markRequestChatSeen(requestId, resolvedSeenAt);
    setRequestRoomSeenMap((current) => ({
      ...current,
      [requestId]: resolvedSeenAt,
    }));
    setActiveThread({ kind: "request", id: requestId });
    setRequestPage(1);
    setMessageText("");
    setFile(null);
  }, []);

  useEffect(() => {
    if (activeThread?.kind === "admin" && activeConversation) return;
    if (activeThread?.kind === "request" && activeRequestRoomEntry) return;

    if (sortedAdminConversations.length) {
      void handleSelectConversation(sortedAdminConversations[0].id);
      return;
    }

    if (requestRoomEntries.length) {
      handleSelectRequestRoom(requestRoomEntries[0].request.id, requestRoomEntries[0].lastActivityAt);
      return;
    }

    if (activeThread) {
      setActiveThread(null);
    }
  }, [
    activeConversation,
    activeRequestRoomEntry,
    activeThread,
    handleSelectConversation,
    handleSelectRequestRoom,
    requestRoomEntries,
    sortedAdminConversations,
  ]);

  const adminMessagesQuery = useQuery({
    queryKey: ["chat", activeConversation?.id, "messages", adminPage],
    queryFn: async () => {
      if (!activeConversation) return [];

      const pages = await Promise.all(
        Array.from({ length: adminPage }, (_, index) =>
          chatApi.getMessages(activeConversation.id, {
            page: index + 1,
            limit: MESSAGES_PER_PAGE,
          }),
        ),
      );

      return pages
        .flatMap((response) => normalizeListResponse<Message>(response.data).data)
        .sort((a, b) => toTimeValue(a.created_at) - toTimeValue(b.created_at));
    },
    enabled: Boolean(activeConversation?.id),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === activeConversation?.id ? previousData : undefined,
    refetchInterval: 3_000,
  });

  const requestMessagesQuery = useQuery({
    queryKey: ["patient-chat", activeRequestRoomEntry?.request.id, "messages", requestPage],
    queryFn: async () => {
      if (!activeRequestRoomEntry) return [];

      const pages = await Promise.all(
        Array.from({ length: requestPage }, (_, index) =>
          requestsApi.listChatMessages(
            activeRequestRoomEntry.request.id,
            REQUEST_ROOM_TYPE,
            { page: index + 1, limit: MESSAGES_PER_PAGE },
          ),
        ),
      );

      return pages
        .flatMap((response) => {
          const messages = response.data.data;
          return Array.isArray(messages) ? (messages as RequestChatMessage[]) : [];
        })
        .sort((a, b) => toTimeValue(a.created_at) - toTimeValue(b.created_at));
    },
    enabled: Boolean(activeRequestRoomEntry?.request.id),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === activeRequestRoomEntry?.request.id ? previousData : undefined,
    refetchInterval: 3_000,
  });

  const clearLocationTracking = useCallback(() => {
    if (typeof navigator !== "undefined" && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const shareCurrentLocation = useCallback(() => {
    if (isSharingLocation || !activeThread || watchIdRef.current !== null) return;
    if (activeThread.kind === "request" && !activeRequestRoomEntry?.isOpen) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(tChatPage("chatLocationNotSupported"));
      return;
    }

    const currentThread = activeThread;
    const currentRequestRoomEntry = activeRequestRoomEntry;

    setIsSharingLocation(true);
    let bestPosition: GeolocationPosition | null = null;

    const sendBestPosition = async () => {
      clearLocationTracking();

      if (!bestPosition) {
        toast.error(tChatPage("chatLocationFailed"));
        setIsSharingLocation(false);
        return;
      }

      try {
        const { latitude, longitude, accuracy } = bestPosition.coords;
        const accuracyMeters = Math.round(accuracy);

        if (currentThread.kind === "admin") {
          await chatApi.sendMessage(currentThread.id, {
            body: buildLocationMessage(
              tChatPage("chatLocationMessagePrefix"),
              latitude,
              longitude,
            ),
          });
          await queryClient.invalidateQueries({
            queryKey: ["chat", currentThread.id, "messages"],
          });
          await queryClient.invalidateQueries({
            queryKey: ["chat", "conversations"],
          });
        } else {
          if (!currentRequestRoomEntry?.isOpen) {
            toast.error(tChatPage("requestClosedNotice"));
            setIsSharingLocation(false);
            return;
          }

          await requestsApi.sendChatMessage(currentThread.id, REQUEST_ROOM_TYPE, {
            body: buildLocationMessage(
              tChatPage("chatLocationMessagePrefix"),
              latitude,
              longitude,
            ),
          });
          await queryClient.invalidateQueries({
            queryKey: ["patient-chat", currentThread.id, "messages"],
          });
          await queryClient.invalidateQueries({
            queryKey: ["patient-chat", "request-room-metadata"],
          });
        }
        if (accuracyMeters > 100) {
          toast.warning(
            tChatPage("chatLocationLowAccuracy", { meters: accuracyMeters }),
            { duration: 6000 },
          );
        } else {
          toast.success(
            tChatPage("chatLocationSentWithAccuracy", { meters: accuracyMeters }),
          );
        }
      } catch {
        toast.error(tChatPage("chatLocationFailed"));
      } finally {
        setIsSharingLocation(false);
      }
    };

    timeoutIdRef.current = setTimeout(() => {
      void sendBestPosition();
    }, 5000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = position;
          if (position.coords.accuracy <= 20) {
            if (timeoutIdRef.current) {
              clearTimeout(timeoutIdRef.current);
              timeoutIdRef.current = null;
            }
            void sendBestPosition();
          }
        }
      },
      (error) => {
        clearLocationTracking();
        const denied = error.code === error.PERMISSION_DENIED;
        toast.error(
          denied
            ? tChatPage("chatLocationPermissionDenied")
            : tChatPage("chatLocationFailed"),
        );
        setIsSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [activeRequestRoomEntry, activeThread, clearLocationTracking, isSharingLocation, queryClient, tChatPage]);

  useEffect(() => {
    return () => {
      clearLocationTracking();
    };
  }, [clearLocationTracking]);

  useEffect(() => {
    const latestExternalMessage = [...(requestMessagesQuery.data || [])].reverse().find((message) => message.sender_role !== "PATIENT");
    if (!activeRequestRoomEntry?.request.id || !latestExternalMessage?.created_at) return;

    markRequestChatSeen(activeRequestRoomEntry.request.id, latestExternalMessage.created_at);
    setRequestRoomSeenMap((current) => {
      if (current[activeRequestRoomEntry.request.id] === latestExternalMessage.created_at) {
        return current;
      }

      return {
        ...current,
        [activeRequestRoomEntry.request.id]: latestExternalMessage.created_at,
      };
    });
  }, [activeRequestRoomEntry, requestMessagesQuery.data]);

  useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, adminMessagesQuery.data, requestMessagesQuery.data]);

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

      if (!activeRequestRoomEntry?.isOpen) {
        throw new Error(tChatPage("requestClosedNotice"));
      }

      await requestsApi.sendChatMessage(activeThread.id, REQUEST_ROOM_TYPE, {
        body: messageText.trim() || undefined,
        file: file || undefined,
      });
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
    onError: (error) => {
      const message = error instanceof Error ? error.message : tCommon("error");
      toast.error(message);
    },
  });

  const hasInboxEntries = Boolean(sortedAdminConversations.length || requestRoomEntries.length);
  const isInitialLoading =
    (conversationsQuery.isLoading && !conversationsQuery.data) ||
    (requestRoomsQuery.isLoading && !requestRoomsQuery.data);

  const adminMessages = adminMessagesQuery.data || [];
  const requestMessages = requestMessagesQuery.data || [];
  const requestThreadActive = activeThread?.kind === "request" && Boolean(activeRequestRoomEntry);
  const adminThreadActive = activeThread?.kind === "admin" && Boolean(activeConversation);
  const activeThreadLoading =
    requestThreadActive
      ? requestMessagesQuery.isLoading && !requestMessages.length
      : adminThreadActive
      ? adminMessagesQuery.isLoading && !adminMessages.length
      : false;
  const activeThreadError = requestThreadActive ? requestMessagesQuery.error : adminThreadActive ? adminMessagesQuery.error : null;
  const canSendMessage =
    (activeThread?.kind === "admin" && Boolean(activeConversation))
    || (activeThread?.kind === "request" && Boolean(activeRequestRoomEntry?.isOpen));
  const handleLoadMoreRequest = useCallback(() => {
    skipNextAutoScrollRef.current = true;
    setRequestPage((page) => page + 1);
  }, []);

  const handleLoadMoreAdmin = useCallback(() => {
    skipNextAutoScrollRef.current = true;
    setAdminPage((page) => page + 1);
  }, []);

  const handleRetry = useCallback(() => {
    if (requestThreadActive) {
      void requestMessagesQuery.refetch();
      return;
    }

    if (adminThreadActive) {
      void adminMessagesQuery.refetch();
    }
  }, [adminMessagesQuery, adminThreadActive, requestMessagesQuery, requestThreadActive]);

  const handleSubmitMessage = useCallback(() => {
    sendMutation.mutate();
  }, [sendMutation]);

  const handleSelectConversationClick = useCallback((conversationId: string) => {
    void handleSelectConversation(conversationId);
  }, [handleSelectConversation]);

  const setBottomAnchorRef = useCallback((node: HTMLDivElement | null) => {
    bottomRef.current = node;
  }, []);

  if (isInitialLoading) {
    return <AppPreloader variant="page" title={tNav("chat")} description={tChatPage("adminOnlyDescription")} blockCount={4} />;
  }

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
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
        <ChatInboxPane
          hasInboxEntries={hasInboxEntries}
          isRtl={isRtl}
          locale={locale}
          requestRoomEntries={requestRoomEntries}
          selectedThread={activeThread}
          sortedAdminConversations={sortedAdminConversations}
          tChatPage={tChatPage}
          onSelectConversation={handleSelectConversationClick}
          onSelectRequestRoom={handleSelectRequestRoom}
        />

        <ChatThreadPane
          activeConversation={activeConversation}
          activeRequestRoomEntry={activeRequestRoomEntry}
          activeThread={activeThread}
          activeThreadError={activeThreadError}
          activeThreadLoading={activeThreadLoading}
          adminMessages={adminMessages}
          adminPage={adminPage}
          adminThreadActive={adminThreadActive}
          bottomAnchorRef={setBottomAnchorRef}
          canSendMessage={canSendMessage}
          file={file}
          isRtl={isRtl}
          isSharingLocation={isSharingLocation}
          locale={locale}
          locationDirectionsLabel={locationLabels.directions}
          locationSharedLabel={locationLabels.shared}
          locationViewLabel={locationLabels.view}
          messageText={messageText}
          requestMessages={requestMessages}
          requestPage={requestPage}
          requestThreadActive={requestThreadActive}
          sendPending={sendMutation.isPending}
          tChatPage={tChatPage}
          tCommon={tCommon}
          onFileChange={setFile}
          onLoadMoreAdmin={handleLoadMoreAdmin}
          onLoadMoreRequest={handleLoadMoreRequest}
          onLocationShare={shareCurrentLocation}
          onMessageTextChange={setMessageText}
          onRetry={handleRetry}
          onSubmit={handleSubmitMessage}
        />
      </div>
    </div>
  );
}
