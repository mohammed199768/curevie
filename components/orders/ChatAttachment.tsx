"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { casesApi, type ChatMessage } from "@/lib/api/cases";
import { downloadProtectedFile, fetchProtectedObjectUrl } from "@/lib/download";
import { cn } from "@/lib/utils";

/** Chat attachments have no public URL: images are previewed and files downloaded through the file endpoint. */
export function ChatAttachment({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const t = useTranslations("chatPage");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const isImage = Boolean(message.file_mime?.startsWith("image/"));

  useEffect(() => {
    if (!isImage) return undefined;

    let objectUrl: string | null = null;
    let cancelled = false;

    fetchProtectedObjectUrl(() => casesApi.downloadChatFile(message.room_id, message.id, true))
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewUrl(url);
      })
      .catch(() => setPreviewUrl(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isImage, message.id, message.room_id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProtectedFile(() => casesApi.downloadChatFile(message.room_id, message.id), message.file_name || "attachment");
    } catch {
      toast.error(t("attachmentFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob: object URLs cannot go through next/image
        <img src={previewUrl} alt={message.file_name || t("attachmentPreview")} className="max-h-60 rounded-lg object-contain" />
      ) : null}
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
          mine ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-background",
        )}
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isImage ? <Download className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
        <span className="truncate">{message.file_name || t("openAttachment")}</span>
      </button>
    </div>
  );
}
