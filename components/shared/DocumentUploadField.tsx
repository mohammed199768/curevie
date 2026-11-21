"use client";

import { useRef, type ChangeEvent, type ReactNode } from "react";
import { Camera, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** What the backend accepts for private documents (ID, insurance card): JPG, PNG, WEBP or PDF, up to 20 MB. */
export const DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
const DOCUMENT_TYPES = new Set(DOCUMENT_ACCEPT.split(","));

export type DocumentPickError = "type" | "size";

/** Checks a picked file before it is sent; null when it can be uploaded. */
export function validateDocumentFile(file: File): DocumentPickError | null {
  if (!DOCUMENT_TYPES.has(file.type)) return "type";
  if (file.size > DOCUMENT_MAX_BYTES) return "size";
  return null;
}

/**
 * Phone-friendly document picker: "take a photo" opens the camera, "choose a file" opens the gallery or
 * files (photo, screenshot or PDF). The parent decides what happens with the file (upload now or on submit).
 */
export function DocumentUploadField({
  idPrefix,
  fileName,
  done = false,
  busy = false,
  doneLabel,
  error,
  onPick,
  onInvalid,
  note,
  className,
}: {
  idPrefix: string;
  /** Name of the file that was picked or uploaded. */
  fileName?: string | null;
  /** The document is ready (uploaded, or picked when the upload happens on submit). */
  done?: boolean;
  busy?: boolean;
  doneLabel?: string;
  error?: string | null;
  onPick: (file: File) => void;
  onInvalid?: (reason: DocumentPickError) => void;
  /** Small reassuring line under the buttons (e.g. who can see the document). */
  note?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("verification.upload");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow picking the same file again after an error.
    event.target.value = "";
    if (!file) return;
    const problem = validateDocumentFile(file);
    if (problem) {
      onInvalid?.(problem);
      return;
    }
    onPick(file);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {done || busy ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3",
            done && !busy ? "bg-[#e5f5ea] text-[#1c6e3d]" : "bg-[#f1f5f4] text-[#12312d]",
          )}
          role="status"
        >
          {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">{busy ? t("uploading") : doneLabel || t("ready")}</p>
            {fileName ? (
              <p className="flex items-center gap-1 truncate text-[13px] opacity-80">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" dir="auto">{fileName}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="app-press flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#104d49] px-3 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          <Camera className="h-5 w-5 shrink-0" />
          {t("takePhoto")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="app-press flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-[#cfded7] bg-white px-3 text-[15px] font-semibold text-[#104d49] disabled:opacity-50"
        >
          <Upload className="h-5 w-5 shrink-0" />
          {done ? t("replaceFile") : t("chooseFile")}
        </button>
      </div>
      <input
        ref={cameraRef}
        id={`${idPrefix}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <input
        ref={fileRef}
        id={`${idPrefix}-file`}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />

      <p className="px-1 text-[12.5px] leading-5 text-[#617672]">{t("formats")}</p>
      {error ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[13.5px] font-medium leading-5 text-rose-700">
          {error}
        </p>
      ) : null}
      {note}
    </div>
  );
}
