"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, IdCard, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DocumentUploadField, type DocumentPickError } from "@/components/shared/DocumentUploadField";
import type { VerificationRules } from "@/lib/api/settings";
import {
  getMissingVerification,
  getVerificationErrorMessage,
  isJordanianMobile,
  RESEND_CODE_SECONDS,
  VERIFICATION_STATUS_QUERY_KEY,
  verificationApi,
  type VerificationStatus,
} from "@/lib/api/verification";
import { getApiError } from "@/lib/utils/apiError";
import { cn } from "@/lib/utils";

/** What ordering requires and what this account already did. Only for logged-in patients. */
export function useVerificationStatus(enabled = true) {
  return useQuery({
    queryKey: VERIFICATION_STATUS_QUERY_KEY,
    queryFn: verificationApi.getStatus,
    enabled,
    staleTime: 60_000,
  });
}

function SectionCard({
  icon: Icon,
  title,
  description,
  done,
  children,
  className,
}: {
  icon: typeof IdCard;
  title: string;
  description: string;
  done: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-[#dbe7e2] bg-white p-4 text-[#12312d]", className)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            done ? "bg-[#e5f5ea] text-[#1c6e3d]" : "bg-[#e6f0ee] text-[#104d49]",
          )}
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-bold leading-6">{title}</h3>
          <p className="mt-1 text-[14px] leading-6 text-[#617672]">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PrivacyNote() {
  const t = useTranslations("verification");
  return (
    <p className="flex items-start gap-2 rounded-xl bg-[#f1f5f4] px-3 py-2.5 text-[13.5px] leading-5 text-[#46625b]">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5a7a50]" />
      <span>{t("id.privacy")}</span>
    </p>
  );
}

function useUploadMessages() {
  const t = useTranslations("verification");
  return (reason: DocumentPickError) => (reason === "size" ? t("errors.FILE_TOO_LARGE") : t("errors.INVALID_FILE_TYPE"));
}

/**
 * Sends a 6-digit code to the phone and checks what the person types. The code itself is never shown here.
 * `onVerified` receives the short-lived token that proves the phone (guests send it with the order).
 */
function PhoneCodeField({
  phone,
  guest,
  verified,
  onVerified,
}: {
  phone: string;
  guest: boolean;
  verified: boolean;
  onVerified: (token: string) => void;
}) {
  const t = useTranslations("verification");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // A different number needs a new code.
  useEffect(() => {
    setCodeSent(false);
    setCode("");
    setSecondsLeft(0);
    setError(null);
  }, [phone]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const requestMutation = useMutation({
    mutationFn: () => verificationApi.requestPhoneCode(phone, guest),
    onSuccess: () => {
      setCodeSent(true);
      setCode("");
      setError(null);
      setSecondsLeft(RESEND_CODE_SECONDS);
    },
    onError: (requestError) => {
      setError(getVerificationErrorMessage(requestError, t));
      // The limit was reached, but an earlier code may still be valid: let the person type it.
      if (getApiError(requestError).code === "TOO_MANY_CODES") setCodeSent(true);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => verificationApi.confirmPhoneCode(phone, code, guest),
    onSuccess: (result) => {
      setError(null);
      onVerified(result.verification_token);
    },
    onError: (confirmError) => {
      const { code: errorCode } = getApiError(confirmError);
      setError(getVerificationErrorMessage(confirmError, t));
      if (errorCode === "CODE_EXPIRED" || errorCode === "TOO_MANY_ATTEMPTS") {
        setCode("");
        setSecondsLeft(0);
      }
    },
  });

  if (verified) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-[#e5f5ea] px-4 py-3 text-[15px] font-bold text-[#1c6e3d]" role="status">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        {t("phone.verified")}
      </p>
    );
  }

  const phoneLooksValid = isJordanianMobile(phone);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f1f5f4] px-4 py-3">
        <span className="text-[13.5px] text-[#617672]">{t("phone.numberLabel")}</span>
        <span dir="ltr" className="text-[16px] font-bold tabular-nums text-[#12312d]">{phone || "-"}</span>
      </div>

      {!phoneLooksValid ? (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-[13.5px] font-medium leading-5 text-amber-900">
          {t("errors.INVALID_PHONE")}
        </p>
      ) : null}

      {!codeSent ? (
        <button
          type="button"
          onClick={() => requestMutation.mutate()}
          disabled={requestMutation.isPending || !phoneLooksValid}
          className="app-press flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#104d49] px-5 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {requestMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-5 w-5" />}
          {t("phone.sendCode")}
        </button>
      ) : (
        <>
          <p className="px-1 text-[14px] leading-6 text-[#46625b]">{t("phone.codeSent")}</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              dir="ltr"
              aria-label={t("phone.codeLabel")}
              placeholder="••••••"
              className="h-[52px] min-w-0 flex-1 rounded-2xl border border-[#cfded7] bg-white px-4 text-center text-[22px] font-bold tracking-[0.4em] text-[#12312d] outline-none ring-[#86ab62] focus:ring-2"
            />
            <button
              type="button"
              onClick={() => confirmMutation.mutate()}
              disabled={code.length !== 6 || confirmMutation.isPending}
              className="app-press flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#104d49] px-5 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {confirmMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {t("phone.confirm")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => requestMutation.mutate()}
            disabled={secondsLeft > 0 || requestMutation.isPending}
            className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-[#104d49] disabled:text-[#8a9b96]"
          >
            {secondsLeft > 0 ? t("phone.resendIn", { seconds: secondsLeft }) : t("phone.resend")}
          </button>
        </>
      )}

      {error ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[13.5px] font-medium leading-5 text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** True when a logged-in patient still has to upload the ID or verify the phone before ordering. */
export function needsVerification(status: VerificationStatus | null | undefined) {
  return getMissingVerification(status).length > 0;
}

/**
 * "Prove it is you" step for logged-in patients, shown once per account: upload the ID (photo, or a
 * screenshot / PDF from the Sanad app) and, when the admin requires it, confirm the profile phone with a code.
 * Both are saved on the account, so later orders skip this step.
 */
export function PatientVerificationStep({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("verification");
  const queryClient = useQueryClient();
  const statusQuery = useVerificationStatus();
  const status = statusQuery.data;
  const uploadMessage = useUploadMessages();
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const patchStatus = (patch: Partial<VerificationStatus>) => {
    queryClient.setQueryData<VerificationStatus>(VERIFICATION_STATUS_QUERY_KEY, (current) =>
      current ? { ...current, ...patch } : current,
    );
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => verificationApi.uploadIdDocument(file),
    onSuccess: (result) => {
      setUploadError(null);
      patchStatus({ id_document_uploaded: true, id_document_uploaded_at: result.uploaded_at });
    },
    onError: (error) => setUploadError(getVerificationErrorMessage(error, t)),
  });

  if (statusQuery.isLoading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-2xl bg-[#f1f5f4] px-4 py-4 text-[14px] text-[#617672]", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!status) {
    return (
      <div className={cn("space-y-3 rounded-2xl bg-rose-50 px-4 py-4 text-center", className)}>
        <p className="text-[14.5px] text-rose-700">{t("errors.GENERIC")}</p>
        <button
          type="button"
          onClick={() => void statusQuery.refetch()}
          className="app-press inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 text-[14px] font-semibold text-[#104d49]"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {status.require_id ? (
        <SectionCard
          icon={IdCard}
          title={t("id.title")}
          description={status.id_document_uploaded ? t("id.doneDescription") : t("id.description")}
          done={status.id_document_uploaded}
        >
          <DocumentUploadField
            idPrefix="patient-id"
            fileName={fileName}
            done={status.id_document_uploaded}
            busy={uploadMutation.isPending}
            doneLabel={t("id.done")}
            error={uploadError}
            onPick={(file) => {
              setFileName(file.name);
              setUploadError(null);
              uploadMutation.mutate(file);
            }}
            onInvalid={(reason) => setUploadError(uploadMessage(reason))}
            note={<PrivacyNote />}
          />
        </SectionCard>
      ) : null}

      {status.require_phone ? (
        <SectionCard
          icon={MessageSquareText}
          title={t("phone.title")}
          description={status.phone_verified ? t("phone.doneDescription") : t("phone.description")}
          done={status.phone_verified}
        >
          <PhoneCodeField
            phone={status.phone || ""}
            guest={false}
            verified={status.phone_verified}
            onVerified={() => patchStatus({ phone_verified: true })}
          />
          {!status.phone_verified ? (
            <p className="mt-3 px-1 text-[13px] leading-5 text-[#617672]">
              {t("phone.wrongNumber")}{" "}
              <Link href={`/${locale}/profile?section=personal`} className="font-semibold text-[#104d49] underline underline-offset-2">
                {t("phone.editProfile")}
              </Link>
            </p>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}

export interface GuestVerificationValue {
  idDocumentToken: string | null;
  idDocumentName: string | null;
  phoneToken: string | null;
  /** The phone number the token belongs to: a changed number needs a new code. */
  phoneTokenFor: string | null;
}

export const EMPTY_GUEST_VERIFICATION: GuestVerificationValue = {
  idDocumentToken: null,
  idDocumentName: null,
  phoneToken: null,
  phoneTokenFor: null,
};

export function isGuestVerificationComplete(rules: VerificationRules | null | undefined, value: GuestVerificationValue, phone: string) {
  if (rules?.require_id && !value.idDocumentToken) return false;
  if (rules?.require_phone && !(value.phoneToken && value.phoneTokenFor === phone)) return false;
  return true;
}

/**
 * The same step for guests. Guests verify on every order: the ID upload returns a token and the phone code
 * returns a token; both travel with the order (id_document_token, phone_verification_token).
 */
export function GuestVerificationStep({
  rules,
  phone,
  value,
  onChange,
  className,
}: {
  rules: VerificationRules;
  phone: string;
  value: GuestVerificationValue;
  onChange: (next: GuestVerificationValue) => void;
  className?: string;
}) {
  const t = useTranslations("verification");
  const uploadMessage = useUploadMessages();
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => verificationApi.uploadGuestIdDocument(file),
    onSuccess: (result, file) => {
      setUploadError(null);
      onChange({ ...value, idDocumentToken: result.id_document_token, idDocumentName: file.name });
    },
    onError: (error) => setUploadError(getVerificationErrorMessage(error, t)),
  });

  const phoneVerified = Boolean(value.phoneToken && value.phoneTokenFor === phone);

  return (
    <div className={cn("space-y-3", className)}>
      {rules.require_id ? (
        <SectionCard
          icon={IdCard}
          title={t("id.title")}
          description={value.idDocumentToken ? t("id.doneDescriptionGuest") : t("id.description")}
          done={Boolean(value.idDocumentToken)}
        >
          <DocumentUploadField
            idPrefix="guest-id"
            fileName={uploadMutation.isPending ? pendingName : value.idDocumentName}
            done={Boolean(value.idDocumentToken)}
            busy={uploadMutation.isPending}
            doneLabel={t("id.done")}
            error={uploadError}
            onPick={(file) => {
              setPendingName(file.name);
              setUploadError(null);
              uploadMutation.mutate(file);
            }}
            onInvalid={(reason) => setUploadError(uploadMessage(reason))}
            note={<PrivacyNote />}
          />
        </SectionCard>
      ) : null}

      {rules.require_phone ? (
        <SectionCard
          icon={MessageSquareText}
          title={t("phone.title")}
          description={phoneVerified ? t("phone.doneDescription") : t("phone.descriptionGuest")}
          done={phoneVerified}
        >
          <PhoneCodeField
            phone={phone}
            guest
            verified={phoneVerified}
            onVerified={(token) => onChange({ ...value, phoneToken: token, phoneTokenFor: phone })}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
