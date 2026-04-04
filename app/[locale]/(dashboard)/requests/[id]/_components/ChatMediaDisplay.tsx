"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { requestsApi } from "@/lib/api/requests";

interface ChatMediaDisplayProps {
  filePath: string;
  fileName?: string | null;
  requestId: string;
  isImage?: boolean;
}

function isDirectMediaPath(filePath: string) {
  return filePath.startsWith("http") || filePath.startsWith("/uploads/");
}

function isImagePath(filePath: string, fileName?: string | null) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName || filePath);
}

export function ChatMediaDisplay({
  filePath,
  fileName,
  requestId,
  isImage,
}: ChatMediaDisplayProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const shouldRenderAsImage = useMemo(
    () => (typeof isImage === "boolean" ? isImage : isImagePath(filePath, fileName)),
    [fileName, filePath, isImage],
  );

  useEffect(() => {
    let cancelled = false;

    if (!filePath) {
      setUrl(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (isDirectMediaPath(filePath)) {
      setUrl(filePath);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setUrl(null);

    requestsApi.getSecureChatMediaUrl(filePath, requestId).then((signedUrl) => {
      if (cancelled) return;
      setUrl(signedUrl);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filePath, requestId]);

  if (loading) {
    return <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (!url) {
    return <span className="mt-2 block text-xs text-muted-foreground">Media unavailable</span>;
  }

  if (shouldRenderAsImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        <img
          src={url}
          alt={fileName || "Image"}
          className="max-h-[200px] max-w-[200px] rounded-md object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 underline"
    >
      <FileText className="h-4 w-4" />
      {fileName || "Download file"}
    </a>
  );
}
