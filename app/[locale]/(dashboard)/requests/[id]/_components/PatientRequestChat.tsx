"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FileText, Loader2, MapPin, MessageSquareMore, Navigation, Paperclip, Send, ShieldCheck, Stethoscope, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requestsApi } from "@/lib/api/requests";
import type { RequestChatMessage, RequestStatus } from "@/lib/api/types";
import { markRequestChatSeen } from "@/lib/request-chat-read-state";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { ChatMediaDisplay } from "./ChatMediaDisplay";

interface PatientRequestChatProps {
  requestId: string;
  requestStatus: RequestStatus;
}

const CHAT_VISIBLE_STATUSES: RequestStatus[] = ["IN_PROGRESS", "COMPLETED", "CLOSED"];
const CHAT_SENDABLE_STATUSES: RequestStatus[] = ["IN_PROGRESS", "COMPLETED"];
const LOCATION_LINK_REGEX = /https?:\/\/www\.google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i;

function buildLocationMessage(label: string, latitude: number, longitude: number) {
  return `${label}\nhttps://www.google.com/maps?q=${latitude},${longitude}`;
}

function extractLocationInfo(content: string | null) {
  if (!content) return null;

  const match = content.match(LOCATION_LINK_REGEX);
  if (!match) return null;

  const latitude = match[1];
  const longitude = match[2];
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const displayText = content.replace(match[0], "").trim();

  return {
    latitude,
    longitude,
    mapUrl,
    directionsUrl,
    displayText,
  };
}

function getInitials(value: string | null | undefined, fallback: string) {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;

  const parts = normalized.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getSpeakerLabel(message: RequestChatMessage, t: ReturnType<typeof useTranslations>) {
  if (message.sender_role === "PATIENT") return t("chatYou");
  return message.sender_name || t("chatCareProvider");
}

function isImageFile(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url.split("?")[0] || "");
}

function ChatBubble({
  locale,
  message,
  requestId,
  t,
}: {
  locale: string;
  message: RequestChatMessage;
  requestId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const mine = message.sender_role === "PATIENT";
  const speakerLabel = getSpeakerLabel(message, t);
  const initials = getInitials(speakerLabel, mine ? "Y" : "CP");
  const locationInfo = extractLocationInfo(message.content);
  const textContent = locationInfo ? locationInfo.displayText : message.content;

  return (
    <div className={cn("flex items-end gap-3", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <Avatar className="h-10 w-10 border border-border/70 shadow-sm">
          <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : null}

      <div
        className={cn(
          "max-w-[90%] rounded-[1.65rem] border px-4 py-3 text-sm shadow-sm transition-colors sm:max-w-[78%]",
          mine
            ? "rounded-br-md border-primary/30 bg-primary text-primary-foreground shadow-primary/20"
            : "rounded-bl-md border-border/70 bg-background",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
            {speakerLabel}
          </span>
          <span className={cn("text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {formatRelativeTime(message.created_at, locale)}
          </span>
        </div>

        {textContent ? <p className="whitespace-pre-wrap leading-6">{textContent}</p> : null}

        {locationInfo ? (
          <div
            className={cn(
              "mt-3 rounded-2xl border px-3 py-3",
              mine ? "border-primary-foreground/15 bg-primary-foreground/10" : "border-border/70 bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
              <MapPin className="h-3.5 w-3.5" />
              {t("chatLocationShared")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={locationInfo.mapUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  mine
                    ? "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
                    : "border-border/70 bg-background hover:bg-muted",
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                {t("chatViewLocation")}
              </a>
              <a
                href={locationInfo.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  mine
                    ? "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
                    : "border-border/70 bg-background hover:bg-muted",
                )}
              >
                <Navigation className="h-3.5 w-3.5" />
                {t("chatGetDirections")}
              </a>
            </div>
          </div>
        ) : null}

        {message.file_url ? (
          <ChatMediaDisplay
            filePath={message.file_url}
            fileName={message.file_name}
            requestId={requestId}
            isImage={isImageFile(message.file_url)}
          />
        ) : null}
      </div>

      {mine ? (
        <Avatar className="h-10 w-10 border border-primary/20 shadow-sm">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

export default function PatientRequestChat({ requestId, requestStatus }: PatientRequestChatProps) {
  const locale = useLocale();
  const t = useTranslations("requestDetail");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  const chatAvailable = CHAT_VISIBLE_STATUSES.includes(requestStatus);
  const canSend = CHAT_SENDABLE_STATUSES.includes(requestStatus);

  const messagesQuery = useQuery({
    queryKey: ["patient-request", requestId, "provider-patient-chat"],
    queryFn: async () => (
      await requestsApi.listChatMessages(requestId, "PROVIDER_PATIENT", { page: 1, limit: 50 })
    ).data.data as RequestChatMessage[],
    enabled: chatAvailable,
    refetchInterval: 5_000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      requestsApi.sendChatMessage(requestId, "PROVIDER_PATIENT", {
        body: messageText.trim() || undefined,
        file: file || undefined,
      }),
    onSuccess: async () => {
      setMessageText("");
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["patient-request", requestId, "provider-patient-chat"] });
    },
    onError: (error) => {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast.error(message || t("chatSendError"));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const messages = useMemo(() => messagesQuery.data || [], [messagesQuery.data]);

  useEffect(() => {
    const latestExternalMessage = [...messages].reverse().find((message) => message.sender_role !== "PATIENT");
    if (latestExternalMessage?.created_at) {
      markRequestChatSeen(requestId, latestExternalMessage.created_at);
    }
  }, [messages, requestId]);

  const handleSubmit = () => {
    if (!messageText.trim() && !file) return;
    if (sendMutation.isPending || !canSend) return;
    sendMutation.mutate();
  };

  const shareCurrentLocation = () => {
    if (isSharingLocation || !canSend) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(t("chatLocationNotSupported"));
      return;
    }

    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await requestsApi.sendChatMessage(requestId, "PROVIDER_PATIENT", {
            body: buildLocationMessage(
              t("chatLocationMessagePrefix"),
              position.coords.latitude,
              position.coords.longitude,
            ),
          });
          await queryClient.invalidateQueries({ queryKey: ["patient-request", requestId, "provider-patient-chat"] });
          toast.success(t("chatLocationSent"));
        } catch {
          toast.error(t("chatLocationFailed"));
        } finally {
          setIsSharingLocation(false);
        }
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        toast.error(denied ? t("chatLocationPermissionDenied") : t("chatLocationFailed"));
        setIsSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  if (!chatAvailable) {
    return (
      <Card className="overflow-hidden border-border/70 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)]">
        <CardHeader className="relative overflow-hidden border-b border-border/60 bg-background p-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-sky-500/10" />
          <div className="relative px-5 py-5 sm:px-6">
            <CardTitle className="text-xl">{t("chatTitle")}</CardTitle>
            <CardDescription className="mt-1 max-w-xl text-sm leading-6">
              {t("chatSubtitle")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-72 items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <MessageSquareMore className="mx-auto mb-4 h-10 w-10 text-primary" />
            <p className="text-base font-semibold">{t("chatNotAvailableYet")}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("chatSubtitle")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/70 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)]">
      <CardHeader className="relative overflow-hidden border-b border-border/60 bg-background p-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/14 via-background to-emerald-500/10" />
        <div className="relative flex flex-col gap-4 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border/70 shadow-sm">
                <AvatarFallback className="bg-background text-sm font-semibold text-foreground">
                  CP
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{t("chatTitle")}</CardTitle>
                <CardDescription className="mt-1 max-w-2xl text-sm leading-6">
                  {t("chatSubtitle")}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="outline" className="border-primary/15 bg-primary/10 px-3 py-1 text-primary">
                {canSend ? t("chatLive") : t("chatStatusClosed")}
              </Badge>
              <Badge variant="outline" className="border-transparent bg-background/80 px-3 py-1 text-muted-foreground">
                {t("chatMessageHint")}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-b border-border/60 bg-muted/[0.12] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>{t("chatCareProvider")}</span>
            <span className="text-border">•</span>
            <span>{canSend ? t("chatLive") : t("chatClosed")}</span>
          </div>
        </div>

        <div className="max-h-[58vh] space-y-4 overflow-y-auto bg-muted/[0.14] p-4 sm:p-5">
          {messagesQuery.isLoading ? (
            <AppPreloader variant="panel" title={tCommon("loading")} blockCount={2} blockVariant="line" className="min-h-[18rem]" />
          ) : messagesQuery.error ? (
            <div className="flex min-h-[18rem] items-center justify-center text-center">
              <div>
                <p className="text-sm text-destructive">{tCommon("error")}</p>
                <Button variant="outline" className="mt-3" onClick={() => void messagesQuery.refetch()}>
                  {t("chatRetry")}
                </Button>
              </div>
            </div>
          ) : messages.length ? (
            messages.map((message) => (
              <ChatBubble key={message.id} locale={locale} message={message} requestId={requestId} t={t} />
            ))
          ) : (
            <div className="flex min-h-[18rem] items-center justify-center">
              <div className="w-full max-w-sm rounded-[1.4rem] border border-dashed border-border/80 bg-background/80 px-6 py-8 text-center shadow-sm">
                <Stethoscope className="mx-auto mb-3 h-9 w-9 text-primary" />
                <p className="text-sm font-semibold">{t("chatEmpty")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("chatSubtitle")}</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {canSend ? (
          <form
            className="border-t border-border/60 bg-background p-4 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {file ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{t("chatAttachmentReady")}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={t("chatTypeMessage")}
                  className="min-h-[7rem] resize-none rounded-[1.4rem] border-border/70 bg-muted/20 px-4 py-3 leading-6"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">{t("chatMessageHint")}</p>
              </div>

              <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-full px-4"
                  disabled={isSharingLocation}
                  onClick={shareCurrentLocation}
                >
                  {isSharingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      {t("chatShareLocation")}
                    </>
                  )}
                </Button>

                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-medium transition-colors hover:bg-muted/40">
                  <Paperclip className="h-4 w-4" />
                  {t("attachment")}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={sendMutation.isPending || (!messageText.trim() && !file)}
                  className="min-h-11 rounded-full px-5"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("chatSend")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="border-t border-border/60 bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground sm:px-5">
            {t("chatClosed")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
