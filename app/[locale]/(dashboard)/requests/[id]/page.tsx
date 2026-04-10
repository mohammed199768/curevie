"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  MessageCircleMore,
  Shield,
  UserRound,
  type LucideIcon,
  Stethoscope,
  Workflow,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { cultureApi } from "@/lib/api/culture";
import type { CultureResult } from "@/lib/api/culture";
import {
  casesApi,
  type PatientCase,
  type PatientCaseAppointment,
  type PatientCaseService,
} from "@/lib/api/cases";
import type { RequestDetails, RequestLifecycleEvent, RequestStatus } from "@/lib/api/types";
import { translateEnumValue } from "@/lib/i18n";
import { cn, formatDateTime, formatRelativeTime, triggerBlobDownload } from "@/lib/utils";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const TAB_KEYS = ["overview", "reports"] as const;
type TimelineTone = "sky" | "emerald" | "amber" | "violet" | "slate";
type JourneyStepKey = "received" | "assigned" | "inProgress" | "completed" | "closed";
type TabKey = typeof TAB_KEYS[number];
type StatusConfig = {
  color: string;
  descriptionKey: string;
  labelKey: string;
  progressIndex: number;
  stageKey: JourneyStepKey;
  titleKey: string;
};

type TimelineEntry = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  actorLabel: string;
  contextLabel?: string | null;
  stateLabel?: string | null;
  tone: TimelineTone;
  icon: LucideIcon;
  stageKey: JourneyStepKey;
};

const STATUS_CONFIG: Record<RequestStatus, StatusConfig> = {
  PENDING: {
    color: "yellow",
    descriptionKey: "status.pendingDescription",
    labelKey: "status.pendingTitle",
    progressIndex: 0,
    stageKey: "received",
    titleKey: "status.pendingTitle",
  },
  ACCEPTED: {
    color: "yellow",
    descriptionKey: "status.acceptedDescription",
    labelKey: "status.pendingTitle",
    progressIndex: 0,
    stageKey: "received",
    titleKey: "status.acceptedTitle",
  },
  ASSIGNED: {
    color: "blue",
    descriptionKey: "status.assignedDescription",
    labelKey: "status.assignedTitle",
    progressIndex: 1,
    stageKey: "assigned",
    titleKey: "status.assignedTitle",
  },
  IN_PROGRESS: {
    color: "orange",
    descriptionKey: "status.inProgressDescription",
    labelKey: "status.inProgressTitle",
    progressIndex: 2,
    stageKey: "inProgress",
    titleKey: "status.inProgressTitle",
  },
  COMPLETED: {
    color: "green",
    descriptionKey: "status.completedDescription",
    labelKey: "status.completedTitle",
    progressIndex: 3,
    stageKey: "completed",
    titleKey: "status.completedTitle",
  },
  CLOSED: {
    color: "gray",
    descriptionKey: "status.closedDescription",
    labelKey: "status.closedTitle",
    progressIndex: 4,
    stageKey: "closed",
    titleKey: "status.closedTitle",
  },
  CANCELLED: {
    color: "red",
    descriptionKey: "status.cancelledDescription",
    labelKey: "status.cancelledTitle",
    progressIndex: 1,
    stageKey: "assigned",
    titleKey: "status.cancelledTitle",
  },
};

const EVENT_TONE_MAP: Record<string, TimelineTone> = {
  APPOINTMENT_SCHEDULED: "sky",
  FOLLOW_UP_SCHEDULED: "sky",
  REQUEST_CHAT_MESSAGE_SENT: "sky",
  TASK_ASSIGNED: "sky",
  TASK_ACCEPTED: "sky",
  PACKAGE_TASKS_GENERATED: "sky",
  PAYMENT_RECORDED: "emerald",
  PAYMENT_APPROVED: "emerald",
  STATUS_CHANGED: "amber",
  WORKFLOW_STAGE_CHANGED: "amber",
  ORDER_ADDED: "amber",
  FINAL_REPORT_UPSERTED: "violet",
  SUB_REPORT_UPSERTED: "violet",
  FINAL_REPORT_CONFIRMED: "violet",
  FINAL_REPORT_APPROVED: "violet",
  REQUEST_CLOSED: "violet",
  PUBLISHED: "violet",
};

const EVENT_ICON_MAP: Record<string, LucideIcon> = {
  APPOINTMENT_SCHEDULED: CalendarClock,
  FOLLOW_UP_SCHEDULED: CalendarClock,
  REQUEST_CHAT_MESSAGE_SENT: MessageCircleMore,
  PAYMENT_RECORDED: CreditCard,
  PAYMENT_APPROVED: CreditCard,
  TASK_ASSIGNED: ClipboardCheck,
  TASK_ACCEPTED: CheckCheck,
  PACKAGE_TASKS_GENERATED: Shield,
  FINAL_REPORT_UPSERTED: FileCheck2,
  SUB_REPORT_UPSERTED: FileCheck2,
  FINAL_REPORT_APPROVED: FileCheck2,
  FINAL_REPORT_CONFIRMED: FileCheck2,
  PUBLISHED: FileCheck2,
  REQUEST_CLOSED: FileCheck2,
  STATUS_CHANGED: Activity,
  WORKFLOW_STAGE_CHANGED: Workflow,
  TASK_SUBMITTED: FileText,
  ORDER_ADDED: Stethoscope,
};

const WORKFLOW_STAGE_STAGE_KEY_MAP: Record<string, JourneyStepKey> = {
  PUBLISHED: "closed",
  COMPLETED: "completed",
  IN_PROGRESS: "inProgress",
  WAITING_SUB_REPORTS: "inProgress",
  DOCTOR_REVIEW: "inProgress",
};

const ROOM_LABEL_KEY_MAP: Record<string, string> = {
  PROVIDER_PATIENT: "timelineRooms.providerPatient",
  PATIENT_CARE: "timelineRooms.patientCare",
  CARE_TEAM: "timelineRooms.careTeam",
  DOCTOR_ADMIN: "timelineRooms.doctorAdmin",
};

const REPORT_STATE_LABEL_KEY_MAP: Record<string, string> = {
  DRAFT: "timelineReportStates.draft",
  SUBMITTED: "timelineReportStates.submitted",
  APPROVED: "timelineReportStates.approved",
  REJECTED: "timelineReportStates.rejected",
};

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(STATUS_CONFIG, value);
}

function isTabKey(value: unknown): value is TabKey {
  return typeof value === "string" && TAB_KEYS.some((tabKey) => tabKey === value);
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function getProgressIndex(status: RequestStatus) {
  return STATUS_CONFIG[status]?.progressIndex ?? STATUS_CONFIG.PENDING.progressIndex;
}

function getEventTone(eventType: string): TimelineTone {
  return EVENT_TONE_MAP[eventType] ?? "slate";
}

function getEventIcon(eventType: string): LucideIcon {
  return EVENT_ICON_MAP[eventType] ?? CalendarClock;
}

function getEventStageKey(eventType: string, metadata: Record<string, unknown> | null | undefined): JourneyStepKey {
  const nextStatus = typeof metadata?.to === "string" ? metadata.to : null;
  const nextStage = typeof metadata?.to_stage === "string" ? metadata.to_stage : null;

  if (eventType === "PACKAGE_TASKS_GENERATED") return "received";
  if (eventType === "APPOINTMENT_SCHEDULED" || eventType === "FOLLOW_UP_SCHEDULED") return "assigned";
  if (eventType === "TASK_ASSIGNED" || eventType === "TASK_ACCEPTED") return "assigned";
  if (eventType === "STATUS_CHANGED") {
    return isRequestStatus(nextStatus) ? STATUS_CONFIG[nextStatus].stageKey : "received";
  }
  if (eventType === "REQUEST_CHAT_MESSAGE_SENT" || eventType === "PAYMENT_RECORDED" || eventType === "ORDER_ADDED") {
    return "inProgress";
  }
  if (
    eventType === "TASK_SUBMITTED"
    || eventType === "FINAL_REPORT_UPSERTED"
    || eventType === "SUB_REPORT_UPSERTED"
    || eventType === "FINAL_REPORT_CONFIRMED"
    || eventType === "FINAL_REPORT_APPROVED"
  ) {
    return "completed";
  }
  if (eventType === "WORKFLOW_STAGE_CHANGED") {
    return (nextStage && WORKFLOW_STAGE_STAGE_KEY_MAP[nextStage]) || "received";
  }
  if (eventType === "PAYMENT_APPROVED" || eventType === "REQUEST_CLOSED" || eventType === "PUBLISHED") {
    return "closed";
  }
  return "received";
}

function ReportField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

function InterpretationBadge({ value }: { value: "S" | "I" | "R" }) {
  const colors = {
    S: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    I: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    R: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const labels = { S: "Sensitive", I: "Intermediate", R: "Resistant" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colors[value])}>
      {labels[value]}
    </span>
  );
}

function DetailMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string | null;
  accent?: "default" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.35rem] border p-4 shadow-sm backdrop-blur",
        accent === "primary" ? "border-primary/15 bg-primary/5" : "border-border/70 bg-background/85",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl border",
            accent === "primary" ? "border-primary/15 bg-primary/10 text-primary" : "border-border/70 bg-muted/40 text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold leading-6 text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PackageContentCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  meta,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  meta?: string | null;
}) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-background/90 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
            {badge ? (
              <span className="rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[11px] font-medium text-foreground">
                {badge}
              </span>
            ) : null}
          </div>
          {meta ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

function normalizeCase(caseItem: PatientCase): RequestDetails {
  const firstService = caseItem.services?.[0] || null;
  const firstAppointment = caseItem.appointments?.[0] || null;
  const totalOriginalAmount = (caseItem.services || []).reduce((sum, service) => sum + Number(service.original_price || 0), 0);
  const totalBundleAmount = (caseItem.services || []).reduce((sum, service) => sum + Number(service.bundle_price || 0), 0);
  const completedAt =
    caseItem.services
      ?.map((service) => service.completed_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

  return {
    id: caseItem.id,
    request_id: caseItem.id,
    invoice_id: null,
    request_type: "PATIENT",
    patient_id: caseItem.patient_id,
    guest_name: null,
    guest_phone: null,
    guest_address: null,
    guest_gender: null,
    guest_age: null,
    service_type: caseItem.package_id ? "PACKAGE" : "MEDICAL",
    service_id: firstService?.service_id || null,
    lab_test_id: null,
    lab_panel_id: null,
    lab_package_id: null,
    package_id: caseItem.package_id || null,
    status: String(caseItem.status || "PENDING") as RequestStatus,
    assigned_provider_id: caseItem.lead_provider_id || null,
    notes: caseItem.notes || null,
    admin_notes: null,
    requested_at: caseItem.created_at,
    scheduled_at: firstAppointment?.scheduled_at || null,
    completed_at: completedAt,
    created_at: caseItem.created_at,
    updated_at: caseItem.updated_at || caseItem.created_at,
    patient_name: caseItem.patient_name || null,
    patient_phone: caseItem.patient_phone || null,
    patient_email: null,
    patient_address: null,
    provider_name: caseItem.lead_provider_name || null,
    provider_type: null,
    service_name: firstService?.service_name || null,
    service_price: firstService?.bundle_price ?? null,
    service_description: firstService?.service_description || null,
    service_category_name: null,
    lab_panel_name: null,
    lab_package_name: null,
    workflow_stage: null,
    workflow_updated_at: null,
    lead_provider_id: caseItem.lead_provider_id || null,
    final_report_confirmed_by: null,
    final_report_confirmed_at: null,
    original_amount: totalOriginalAmount,
    final_amount: totalBundleAmount,
    total_paid: 0,
    remaining_amount: totalBundleAmount,
    is_patient_visible: null,
    in_progress_at: null,
    closed_at: caseItem.closed_at || null,
    collected_amount: null,
    collected_method: null,
    collected_at: null,
    collected_notes: null,
    lab_results: [],
    package_tests: [],
    package_services: (caseItem.services || []).map((service) => ({
      service_id: service.service_id,
      name: service.service_name || null,
      service_kind: "MEDICAL",
      category_name: null,
    })),
  };
}

function mapAppointmentToLifecycleEvent(caseId: string, appointment: PatientCaseAppointment): RequestLifecycleEvent {
  return {
    id: appointment.id,
    request_id: caseId,
    actor_id: null,
    actor_role: "SYSTEM",
    actor_name: null,
    event_type: appointment.type === "INITIAL" ? "APPOINTMENT_SCHEDULED" : "FOLLOW_UP_SCHEDULED",
    description: appointment.notes || null,
    metadata: {
      service_name: appointment.service_name,
      appointment_type: appointment.type,
    },
    workflow_stage_snapshot: null,
    created_at: appointment.scheduled_at,
  };
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestId = String(id || "");
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const t = useTranslations("requestDetail");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [openPdfUrl, setOpenPdfUrl] = useState<string | null>(null);
  const [loadingPdfUrl, setLoadingPdfUrl] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (isTabKey(tab)) {
      setActiveTab(tab);
      return;
    }
    setActiveTab("overview");
  }, [searchParams]);

  const requestQuery = useQuery({
    queryKey: ["patient-request", requestId],
    queryFn: async () => (await casesApi.getById(requestId)).data,
    enabled: Boolean(requestId),
  });

  const reportQuery = useQuery({
    queryKey: ["patient-request", requestId, "report"],
    queryFn: async () => {
      try {
        return (await casesApi.getReport(requestId)).data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(requestId),
  });
  const currentCase = requestQuery.data;
  const request = useMemo(
    () => (currentCase ? normalizeCase(currentCase) : null),
    [currentCase],
  );

  const labResultsWithCultureQ = useQuery({
    queryKey: ["patient-request", requestId, "lab-culture-results"],
    queryFn: async () => {
      const labResults = request?.lab_results ?? [];
      const cultureResults: Array<{ labResultId: string; data: CultureResult | null }> = [];
      for (const lr of labResults) {
        if (!lr.id) continue;
        try {
          const res = await cultureApi.get(lr.id);
          cultureResults.push({ labResultId: lr.id, data: res.data });
        } catch {
          cultureResults.push({ labResultId: lr.id, data: null });
        }
      }
      return cultureResults;
    },
    enabled: request?.status === "CLOSED" && Boolean(request?.lab_results?.length),
  });

  const cultureByLabResultId = useMemo(() => {
    const map = new Map<string, CultureResult | null>();
    for (const entry of labResultsWithCultureQ.data ?? []) {
      map.set(entry.labResultId, entry.data);
    }
    return map;
  }, [labResultsWithCultureQ.data]);

  if (requestQuery.isLoading) {
    return <AppPreloader variant="page" title={tCommon("loading")} blockCount={4} />;
  }

  const report = reportQuery.data;

  if (!request) {
    return <p className="text-sm">{t("notFound")}</p>;
  }

  const lifecycleEvents = currentCase
    ? currentCase.appointments.map((appointment) => mapAppointmentToLifecycleEvent(currentCase.id, appointment))
    : [];
  const chronologicalEvents = [...lifecycleEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const caseServices = [...(currentCase?.services || [])].sort((a: PatientCaseService, b: PatientCaseService) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();
    return bTime - aTime;
  });
  const isClosed = request.status === "CLOSED";
  const hasOpenPdf = isClosed && Boolean(report || openPdfUrl);
  const progressIndex = getProgressIndex(request.status);

  const handleOpenPdf = async () => {
    if (!report || !isClosed) return;

    setLoadingPdfUrl(true);
    try {
      const response = await casesApi.downloadReportPdf(requestId);
      const url = URL.createObjectURL(response.data);
      setOpenPdfUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return url;
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoadingPdfUrl(false);
    }
  };

  const fallbackTimeline = [
    { id: "created", title: t("timelineCreated"), at: request.created_at, meta: request.service_type },
    { id: "scheduled", title: t("timelineScheduled"), at: request.scheduled_at, meta: request.admin_notes },
    { id: "inProgress", title: t("timelineInProgress"), at: request.in_progress_at, meta: null },
    { id: "completed", title: t("timelineCompleted"), at: request.completed_at, meta: null },
    { id: "closed", title: t("timelineClosed"), at: request.closed_at, meta: null },
  ].filter((entry) => entry.at);

  const getRoomLabel = (roomType?: string | null) => {
    if (!roomType) return t("timelineRooms.generic");

    const roomLabelKey = ROOM_LABEL_KEY_MAP[roomType];
    return roomLabelKey ? t(roomLabelKey) : t("timelineRooms.generic");
  };

  const getActorLabel = (role?: string | null, actorName?: string | null) => {
    if (role === "PATIENT") return t("timelineRoles.you");
    if (actorName) return actorName;
    switch (role) {
      case "ADMIN":
        return t("timelineRoles.admin");
      case "PROVIDER":
        return t("timelineRoles.provider");
      case "SYSTEM":
        return t("timelineRoles.system");
      default:
        return t("timelineRoles.system");
    }
  };

  const getReportStateLabel = (value?: string | null) => {
    if (!value) return translateEnumValue(value, tEnums);

    const reportStateKey = REPORT_STATE_LABEL_KEY_MAP[value];
    return reportStateKey ? t(reportStateKey) : translateEnumValue(value, tEnums);
  };

  const getStatusLabel = (value?: string | null) => {
    if (!isRequestStatus(value)) return translateEnumValue(value, tEnums);

    return t(STATUS_CONFIG[value].labelKey);
  };

  const resolveLifecycleEntry = (event: RequestLifecycleEvent): TimelineEntry => {
    const roomType = getMetadataString(event.metadata, "room_type");
    const nextStatus = getMetadataString(event.metadata, "to");
    const taskStatus = getMetadataString(event.metadata, "task_status");
    const toStage = getMetadataString(event.metadata, "to_stage");
    const reportState = /saved as ([A-Z_]+)/.exec(event.description || "")?.[1] || null;
    const roomLabel = roomType ? getRoomLabel(roomType) : null;

    let title = t("timelineEvents.updateTitle");
    let description = event.description || t("timelineEvents.updateDescription");
    const contextLabel: string | null = roomLabel;
    let stateLabel: string | null = null;

    switch (event.event_type) {
      case "APPOINTMENT_SCHEDULED":
      case "FOLLOW_UP_SCHEDULED":
        title = t("timelineScheduled");
        description = event.description || getMetadataString(event.metadata, "service_name") || t("timelineHints.assigned");
        break;
      case "PACKAGE_TASKS_GENERATED":
        title = t("timelineEvents.packageTasksGeneratedTitle");
        description = t("timelineEvents.packageTasksGeneratedDescription");
        break;
      case "TASK_ASSIGNED":
        title = t("timelineEvents.taskAssignedTitle");
        description = t("timelineEvents.taskAssignedDescription");
        break;
      case "TASK_ACCEPTED":
        title = t("timelineEvents.taskAcceptedTitle");
        description = t("timelineEvents.taskAcceptedDescription");
        break;
      case "TASK_SUBMITTED":
        title = t("timelineEvents.taskSubmittedTitle");
        description = t("timelineEvents.taskSubmittedDescription", {
          status: getReportStateLabel(taskStatus) || translateEnumValue(taskStatus, tEnums) || t("timelineStage.completed"),
        });
        stateLabel = getReportStateLabel(taskStatus) || translateEnumValue(taskStatus, tEnums) || null;
        break;
      case "STATUS_CHANGED":
        if (nextStatus === "ASSIGNED") {
          title = t("status.assignedTitle");
          description = t("timelineEvents.statusAssignedDescription");
        } else if (nextStatus === "IN_PROGRESS") {
          title = t("status.inProgressTitle");
          description = t("timelineEvents.statusInProgressDescription");
        } else if (nextStatus === "COMPLETED") {
          title = t("timelineEvents.statusCompletedTitle");
          description = t("timelineEvents.statusCompletedDescription");
        } else if (nextStatus === "CLOSED") {
          title = t("status.closedTitle");
          description = t("timelineEvents.statusClosedDescription");
        }
        stateLabel = getStatusLabel(nextStatus) || null;
        break;
      case "PAYMENT_RECORDED":
        title = t("timelineEvents.paymentRecordedTitle");
        description = t("timelineEvents.paymentRecordedDescription");
        break;
      case "PAYMENT_APPROVED":
        title = t("timelineEvents.paymentApprovedTitle");
        description = t("timelineEvents.paymentApprovedDescription");
        break;
      case "FINAL_REPORT_UPSERTED":
        title = t("timelineEvents.finalReportUpdatedTitle");
        description = t("timelineEvents.finalReportUpdatedDescription", {
          status: getReportStateLabel(reportState) || translateEnumValue(reportState, tEnums) || t("timelineStage.current"),
        });
        stateLabel = getReportStateLabel(reportState) || translateEnumValue(reportState, tEnums) || null;
        break;
      case "SUB_REPORT_UPSERTED":
        title = t("timelineEvents.subReportUpdatedTitle");
        description = t("timelineEvents.subReportUpdatedDescription", {
          status: getReportStateLabel(reportState) || translateEnumValue(reportState, tEnums) || t("timelineStage.current"),
        });
        stateLabel = getReportStateLabel(reportState) || translateEnumValue(reportState, tEnums) || null;
        break;
      case "FINAL_REPORT_APPROVED":
        title = t("timelineEvents.finalReportApprovedTitle");
        description = t("timelineEvents.finalReportApprovedDescription");
        break;
      case "FINAL_REPORT_CONFIRMED":
        title = t("timelineEvents.finalReportConfirmedTitle");
        description = t("timelineEvents.finalReportConfirmedDescription");
        break;
      case "REQUEST_CHAT_MESSAGE_SENT":
        if (event.actor_role === "PATIENT") {
          title = t("timelineEvents.chatFromYouTitle");
          description = t("timelineEvents.chatFromYouDescription", { room: roomLabel || t("timelineRooms.generic") });
        } else if (event.actor_role === "PROVIDER") {
          title = t("timelineEvents.chatFromProviderTitle");
          description = t("timelineEvents.chatFromProviderDescription", { room: roomLabel || t("timelineRooms.generic") });
        } else if (event.actor_role === "ADMIN") {
          title = t("timelineEvents.chatFromAdminTitle");
          description = t("timelineEvents.chatFromAdminDescription", { room: roomLabel || t("timelineRooms.generic") });
        } else {
          title = t("timelineEvents.chatGenericTitle");
          description = t("timelineEvents.chatGenericDescription", { room: roomLabel || t("timelineRooms.generic") });
        }
        break;
      case "ORDER_ADDED":
        title = t("timelineEvents.orderAddedTitle");
        description = t("timelineEvents.orderAddedDescription");
        break;
      case "WORKFLOW_STAGE_CHANGED":
        title = t("timelineEvents.workflowAdvancedTitle");
        description = t("timelineEvents.workflowAdvancedDescription", {
          stage: translateEnumValue(toStage || event.workflow_stage_snapshot || "", tEnums) || t("timelineStage.current"),
        });
        stateLabel = translateEnumValue(toStage || event.workflow_stage_snapshot || "", tEnums) || null;
        break;
      case "REQUEST_CLOSED":
        title = t("timelineEvents.requestClosedTitle");
        description = t("timelineEvents.requestClosedDescription");
        break;
      case "PUBLISHED":
        title = t("timelineEvents.publishedTitle");
        description = t("timelineEvents.publishedDescription");
        break;
      default:
        break;
    }

    return {
      id: event.id,
      createdAt: event.created_at,
      title,
      description,
      actorLabel: getActorLabel(event.actor_role, event.actor_name),
      contextLabel,
      stateLabel,
      tone: getEventTone(event.event_type),
      icon: getEventIcon(event.event_type),
      stageKey: getEventStageKey(event.event_type, event.metadata),
    };
  };

  const timelineEntries: TimelineEntry[] = lifecycleEvents.length
    ? [...lifecycleEvents]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(resolveLifecycleEntry)
    : [...fallbackTimeline]
        .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
        .map((entry) => ({
          id: entry.id,
          createdAt: String(entry.at),
          title: entry.title,
          description: entry.meta || t("timelineEvents.updateDescription"),
          actorLabel: t("timelineRoles.system"),
          contextLabel: null,
          stateLabel: null,
          tone: "slate" as const,
          icon: CalendarClock,
          stageKey:
            entry.id === "closed"
              ? "closed"
              : entry.id === "completed"
                ? "completed"
                : entry.id === "inProgress"
                  ? "inProgress"
                  : entry.id === "scheduled"
                    ? "assigned"
                    : "received",
        }));

  const latestTimelineEntry = timelineEntries[0] || null;
  const journeySteps: Array<{ key: JourneyStepKey; label: string; hint: string; icon: LucideIcon }> = [
    { key: "received", label: t("status.pendingTitle"), hint: t("timelineHints.received"), icon: ClipboardCheck },
    { key: "assigned", label: t("status.assignedTitle"), hint: t("timelineHints.assigned"), icon: CalendarClock },
    { key: "inProgress", label: t("status.inProgressTitle"), hint: t("timelineHints.inProgress"), icon: Activity },
    { key: "completed", label: t("timelineEvents.statusCompletedTitle"), hint: t("timelineHints.completed"), icon: FileText },
    { key: "closed", label: t("status.closedTitle"), hint: t("timelineHints.closed"), icon: FileCheck2 },
  ];

  const findEventTime = (matcher: (event: RequestLifecycleEvent) => boolean) => chronologicalEvents.find(matcher)?.created_at || null;
  const stageTimes: Record<JourneyStepKey, string | null> = {
    received: request.created_at || findEventTime(() => true),
    assigned:
      findEventTime((event) => getEventStageKey(event.event_type, event.metadata) === "assigned") || request.scheduled_at || null,
    inProgress:
      request.in_progress_at ||
      findEventTime((event) => {
        const nextStatus = getMetadataString(event.metadata, "to");
        return event.event_type === "STATUS_CHANGED" && nextStatus === "IN_PROGRESS";
      }) ||
      findEventTime((event) => getEventStageKey(event.event_type, event.metadata) === "inProgress") ||
      null,
    completed:
      request.completed_at ||
      findEventTime((event) => {
        const nextStatus = getMetadataString(event.metadata, "to");
        return event.event_type === "STATUS_CHANGED" && nextStatus === "COMPLETED";
      }) ||
      findEventTime((event) => getEventStageKey(event.event_type, event.metadata) === "completed") ||
      null,
    closed:
      request.closed_at ||
      findEventTime((event) => {
        const nextStatus = getMetadataString(event.metadata, "to");
        return event.event_type === "STATUS_CHANGED" && nextStatus === "CLOSED";
      }) ||
      findEventTime((event) => getEventStageKey(event.event_type, event.metadata) === "closed") ||
      null,
  };
  const stageGroups = journeySteps.map((step, index) => ({
    step,
    index,
    entries: timelineEntries.filter((entry) => entry.stageKey === step.key),
  }));

  const statusConfig = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;
  const statusTitleKey = statusConfig.titleKey;
  const statusDescriptionKey = statusConfig.descriptionKey;
  const currentJourneyStep = journeySteps[Math.min(progressIndex, journeySteps.length - 1)] || journeySteps[0];
  const nextJourneyStep =
    request.status === "CLOSED" || request.status === "CANCELLED" ? null : journeySteps[Math.min(progressIndex + 1, journeySteps.length - 1)];
  const journeyProgressPercent = Math.round(((request.status === "CANCELLED" ? 2 : progressIndex + 1) / journeySteps.length) * 100);
  const currentMomentTitle = latestTimelineEntry?.title || currentJourneyStep.label;
  const currentMomentDescription = latestTimelineEntry?.description || t(statusDescriptionKey);
  const nextMomentTitle =
    request.status === "CANCELLED"
      ? t("status.cancelledTitle")
      : nextJourneyStep
        ? nextJourneyStep.label
        : t("timelineJourneyDoneTitle");
  const nextMomentDescription =
    request.status === "CANCELLED"
      ? t("status.cancelledDescription")
      : nextJourneyStep
        ? nextJourneyStep.hint
        : t("timelineJourneyDoneDescription");
  const serviceDisplayName = request.lab_panel_name
    || request.lab_package_name
    || request.service_name
    || translateEnumValue(request.service_type, tEnums)
    || t("serviceType");
  const serviceCategoryLabel =
    request.service_category_name || translateEnumValue(request.service_type, tEnums) || t("pendingValue");
  const serviceDescription =
    request.service_description || (request.service_type === "PACKAGE" ? t("packageHeroDescriptionFallback") : t(statusDescriptionKey));
  const requestNote = request.notes?.trim() || null;
  const providerLabel = request.provider_name || t("pendingValue");
  const providerHint = request.provider_type ? translateEnumValue(request.provider_type, tEnums) : null;
  const currentStageLabel =
    (request.workflow_stage ? translateEnumValue(request.workflow_stage, tEnums) : null) ||
    getStatusLabel(request.status) ||
    t(statusTitleKey);
  const packageServices = request.package_services || [];
  const packageTests = request.package_tests || [];
  const packageMedicalCount = packageServices.filter((service) => service.service_kind === "MEDICAL").length;
  const packageImagingCount = packageServices.filter((service) => service.service_kind === "RADIOLOGY").length;
  const packageIncludedCount = packageServices.length + packageTests.length;
  const packageServiceMixLabel = packageServices.length
    ? `${packageMedicalCount} ${translateEnumValue("MEDICAL", tEnums) || "Medical"} / ${packageImagingCount} ${translateEnumValue("RADIOLOGY", tEnums) || "Radiology"}`
    : null;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/70 shadow-[0_32px_80px_-52px_rgba(15,23,42,0.45)]">
        <CardContent className="relative p-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%)]" />
          <div className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-medium text-foreground">
                  {t("requestNumberLabel")}: #{request.id.slice(0, 8)}
                </span>
                <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {t("serviceCategory")}: {serviceCategoryLabel}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {request.workflow_stage ? <StatusBadge value={request.workflow_stage} /> : null}
                  <StatusBadge value={request.status} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t("title", { id: request.id.slice(0, 8) })}</p>
                  <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-[2.35rem]">{serviceDisplayName}</h1>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">{serviceDescription}</p>
                </div>
              </div>

              {requestNote && requestNote !== serviceDescription ? (
                <div className="rounded-[1.45rem] border border-white/60 bg-background/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("requestNotesTitle")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{requestNote}</p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailMetricCard
                icon={CalendarClock}
                label={t("createdAt")}
                value={formatDateTime(request.created_at, "dd/MM/yyyy, HH:mm", locale)}
                accent="primary"
              />
              <DetailMetricCard
                icon={CalendarClock}
                label={t("scheduledAt")}
                value={request.scheduled_at ? formatDateTime(request.scheduled_at, "dd/MM/yyyy, HH:mm", locale) : t("scheduledPending")}
              />
              <DetailMetricCard
                icon={UserRound}
                label={t("assignedProvider")}
                value={providerLabel}
                hint={providerHint}
              />
              <DetailMetricCard
                icon={Workflow}
                label={t("currentStage")}
                value={currentStageLabel}
                hint={t(statusDescriptionKey)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => {
        if (isTabKey(value)) {
          setActiveTab(value);
        }
      }} className="space-y-4">
        <div className={cn("flex", isRtl ? "justify-end" : "justify-start")}>
          <TabsList
            dir={isRtl ? "rtl" : "ltr"}
            className="h-auto flex-wrap gap-1 p-1"
          >
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="reports">{t("tabs.reports")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Alert dir={isRtl ? "rtl" : "ltr"} className={cn(isRtl && "text-right")}>
            <AlertTitle>{t(statusTitleKey)}</AlertTitle>
            <AlertDescription>{t(statusDescriptionKey)}</AlertDescription>
          </Alert>

          {request.service_type === "PACKAGE" ? (
            <Card className="overflow-hidden border-border/70 shadow-[0_26px_70px_-52px_rgba(15,23,42,0.38)]">
              <CardContent className="p-0">
                <div className="grid gap-0 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <div className="relative border-b border-border/60 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0.96)_48%,rgba(59,130,246,0.05))] p-5 sm:p-6 dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(2,6,23,0.96)_46%,rgba(59,130,246,0.08))] xl:border-b-0 xl:border-e">
                    <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-sky-400/15 blur-3xl" />
                    <div className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />

                    <div className="relative space-y-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/85 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur">
                        <Boxes className="h-3.5 w-3.5" />
                        {t("packageSummaryTitle")}
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">{serviceDisplayName}</h2>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {request.service_description || t("packageSummaryDescription")}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailMetricCard
                          icon={Boxes}
                          label={t("packageIncludedItems")}
                          value={String(packageIncludedCount)}
                          accent="primary"
                        />
                        <DetailMetricCard
                          icon={Stethoscope}
                          label={t("packageMedicalServices")}
                          value={String(packageServices.length)}
                          hint={packageServiceMixLabel}
                        />
                        <DetailMetricCard
                          icon={FlaskConical}
                          label={t("packageLabTestsCount")}
                          value={String(packageTests.length)}
                        />
                        <DetailMetricCard
                          icon={Workflow}
                          label={t("currentStage")}
                          value={currentStageLabel}
                          hint={t(statusDescriptionKey)}
                        />
                      </div>

                      <div className="rounded-[1.45rem] border border-primary/15 bg-background/85 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                            <BadgeCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t("packageReadyForCare")}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("packageReadyForCareDescription")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 p-5 sm:p-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold">{t("includedConsultationsScans")}</p>
                        <p className="text-sm text-muted-foreground">{t("packageIncludedServicesDescription")}</p>
                      </div>

                      {packageServices.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {packageServices.map((service) => (
                            <PackageContentCard
                              key={service.service_id}
                              icon={Stethoscope}
                              title={service.name || service.service_id}
                              subtitle={service.category_name || serviceCategoryLabel}
                              badge={translateEnumValue(service.service_kind || "MEDICAL", tEnums) || service.service_kind || null}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                          {t("noPackageServices")}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold">{t("includedLabTests")}</p>
                        <p className="text-sm text-muted-foreground">{t("packageIncludedLabTestsDescription")}</p>
                      </div>

                      {packageTests.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {packageTests.map((test) => {
                            const testMeta = [test.unit, test.reference_range].filter(Boolean).join(" • ");

                            return (
                              <PackageContentCard
                                key={test.lab_test_id}
                                icon={FlaskConical}
                                title={test.name || test.lab_test_id}
                                subtitle={testMeta || t("packageLabTestsCount")}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                          {t("noPackageLabTests")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div
                dir={isRtl ? "rtl" : "ltr"}
                className={cn(
                  "flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between",
                  isRtl && "text-right",
                )}
              >
                <div className="space-y-1">
                  <CardTitle>{t("timelineTitle")}</CardTitle>
                  <p className="max-w-2xl text-sm text-muted-foreground">{t("timelineSubtitle")}</p>
                </div>
                {latestTimelineEntry ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                    <Shield className="h-3.5 w-3.5" />
                    {t("timelineLatestBadge")}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent dir={isRtl ? "rtl" : "ltr"} className={cn("space-y-6", isRtl && "text-right")}>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0.96)_40%,rgba(59,130,246,0.05))] p-5 shadow-sm sm:p-6 dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(2,6,23,0.96)_42%,rgba(59,130,246,0.08))]"
              >
                <div className={cn("pointer-events-none absolute top-0 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl", isRtl ? "-left-12" : "-right-12")} />
                <div className={cn("pointer-events-none absolute bottom-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl", isRtl ? "-right-8" : "-left-8")} />

                <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(19rem,0.98fr)]">
                  <div className="space-y-5">
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, x: isRtl ? 12 : -12 }}
                      whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35 }}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {t("timelineTrackerEyebrow")}
                    </motion.div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{t("timelineCurrentMoment")}</p>
                      <h3 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-[2rem]">{t(statusTitleKey)}</h3>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">{t(statusDescriptionKey)}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: 0.05 }}
                        className="rounded-[1.5rem] border border-white/60 bg-background/85 p-4 shadow-sm backdrop-blur"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("timelineLatestUpdate")}</p>
                        <p className="mt-3 text-base font-semibold">{currentMomentTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentMomentDescription}</p>
                        {latestTimelineEntry ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                              {latestTimelineEntry.actorLabel}
                            </span>
                            <span className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
                              {formatRelativeTime(latestTimelineEntry.createdAt, locale)}
                            </span>
                          </div>
                        ) : null}
                      </motion.div>

                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        className="rounded-[1.5rem] border border-white/60 bg-background/85 p-4 shadow-sm backdrop-blur"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("timelineNextCheckpoint")}</p>
                        <div className={cn("mt-3 flex items-start gap-2", isRtl && "flex-row-reverse text-right")}>
                          <ArrowRight className={cn("mt-0.5 h-4 w-4 shrink-0 text-primary", isRtl && "rotate-180")} />
                          <div>
                            <p className="text-base font-semibold">{nextMomentTitle}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextMomentDescription}</p>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground">
                        {request.provider_name || t("pendingValue")}
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {formatDateTime(request.created_at, "dd/MM/yyyy, HH:mm", locale)}
                      </span>
                      {request.scheduled_at ? (
                        <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                          {formatDateTime(request.scheduled_at, "dd/MM/yyyy, HH:mm", locale)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, x: isRtl ? -22 : 22 }}
                    whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.05 }}
                    className="rounded-[1.8rem] border border-white/60 bg-background/90 p-4 shadow-lg backdrop-blur sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("timelineJourneyMap")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t("timelineJourneyProgress", { percent: journeyProgressPercent })}</p>
                      </div>
                      <motion.div
                        animate={prefersReducedMotion ? {} : { scale: [1, 1.03, 1] }}
                        transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary"
                      >
                        {journeyProgressPercent}%
                      </motion.div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {stageGroups.map(({ step, index }) => {
                        const StepIcon = step.icon;
                        const stepState =
                          index < progressIndex ? "completed" : index === progressIndex ? "current" : "upcoming";
                        const stateLabel =
                          stepState === "completed"
                            ? t("timelineStage.completed")
                            : stepState === "current"
                              ? t("timelineStage.current")
                              : t("timelineStage.upcoming");
                        const itemClasses =
                          stepState === "completed"
                            ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                            : stepState === "current"
                              ? "border-amber-300/80 bg-amber-50/80 shadow-[0_16px_38px_-30px_rgba(245,158,11,0.75)] dark:border-amber-700/60 dark:bg-amber-950/20"
                              : "border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/15";
                        const iconClasses =
                          stepState === "completed"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
                            : stepState === "current"
                              ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200"
                              : "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200";
                        const connectorClasses =
                          stepState === "completed"
                            ? "from-emerald-300 via-emerald-500/80 to-emerald-300/0 dark:from-emerald-700 dark:via-emerald-500/70 dark:to-transparent"
                            : stepState === "current"
                              ? "from-amber-300 via-amber-500/80 to-amber-300/0 dark:from-amber-700 dark:via-amber-500/70 dark:to-transparent"
                              : "from-rose-300 via-rose-500/80 to-rose-300/0 dark:from-rose-700 dark:via-rose-500/70 dark:to-transparent";
                        const stateBadgeClasses =
                          stepState === "completed"
                            ? "border-emerald-200/80 bg-emerald-100/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
                            : stepState === "current"
                              ? "border-amber-300/80 bg-amber-100/95 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200"
                              : "border-rose-200/80 bg-rose-100/90 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200";

                        return (
                          <motion.div
                            key={step.key}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                            whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={cn("relative rounded-[1.35rem] border p-3.5", itemClasses)}
                          >
                            {index < journeySteps.length - 1 ? (
                              <div
                                className={cn(
                                  "pointer-events-none absolute top-[3.35rem] h-[calc(100%-1.5rem)] w-px bg-gradient-to-b",
                                  connectorClasses,
                                  isRtl ? "right-[1.85rem]" : "left-[1.85rem]",
                                )}
                              />
                            ) : null}

                            <div className={cn("flex items-start gap-3", isRtl && "flex-row-reverse text-right")}>
                              <div className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm", iconClasses)}>
                                {stepState === "current" ? (
                                  <motion.span
                                    aria-hidden
                                    animate={prefersReducedMotion ? {} : { scale: [1, 1.08, 1.18], opacity: [0.22, 0.12, 0] }}
                                    transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-2xl border border-amber-400/60"
                                  />
                                ) : null}
                                <StepIcon className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold">{step.label}</p>
                                  <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", stateBadgeClasses)}>
                                    {stateLabel}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.hint}</p>
                                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                                  {stageTimes[step.key]
                                    ? t("timelineReachedAt", { time: formatDateTime(stageTimes[step.key], "dd/MM/yyyy, HH:mm", locale) })
                                    : t("timelineWaiting")}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="reports"
          dir={isRtl ? "rtl" : "ltr"}
          className={cn("space-y-4", isRtl && "text-right")}
        >
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t("reportTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isClosed ? (
                <Alert dir={isRtl ? "rtl" : "ltr"} className={cn(isRtl && "text-right")}>
                  <AlertTitle>{t("reportPendingTitle")}</AlertTitle>
                  <AlertDescription>{t("reportPendingDescription")}</AlertDescription>
                </Alert>
              ) : (
                <Alert dir={isRtl ? "rtl" : "ltr"} className={cn("border-green-500/40 bg-green-50 dark:bg-green-950/20", isRtl && "text-right")}>
                  <AlertTitle>{t("reportReadyTitle")}</AlertTitle>
                  <AlertDescription>{t("reportReadyDescription")}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!isClosed}
                  onClick={async () => {
                    try {
                      const response = await casesApi.downloadReportPdf(requestId);
                      triggerBlobDownload(response.data, `medical-report-${requestId.slice(0, 8)}.pdf`);
                    } catch {
                      toast.error(t("downloadError"));
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  {t("downloadPdf")}
                </Button>
                {hasOpenPdf ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPdf}
                    disabled={loadingPdfUrl}
                  >
                    {loadingPdfUrl ? tCommon("loading") : t("openPdf")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t("reportDetailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-4 text-sm", isRtl && "text-right")}>
              {caseServices.length ? (
                caseServices.map((service: PatientCaseService) => (
                  <div key={service.id} className="rounded-lg border p-4">
                    <div className={cn("flex flex-wrap items-center justify-between gap-2", isRtl && "text-right")}>
                      <div>
                        <p className="font-semibold">{service.service_name || t("serviceType")}</p>
                        <p className="text-xs text-muted-foreground">{service.provider_name || t("providerFallback")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={service.status} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <ReportField label={t("serviceType")} value={service.service_name} />
                      <ReportField label={t("assignedProvider")} value={service.provider_name || t("providerFallback")} />
                      <ReportField label={tCommon("amount")} value={`${Number(service.bundle_price || 0).toFixed(2)} JD`} />
                      <ReportField label={t("generalNotes")} value={service.notes || request.notes} />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {t("updatedAt")} {formatDateTime(service.updated_at || service.created_at, "dd/MM/yyyy, HH:mm", locale)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">{t("reportHidden")}</p>
              )}
            </CardContent>
          </Card>

          {isClosed && (request?.lab_results?.length ?? 0) > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  {t("labResultsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(request.lab_results ?? []).map((lr) => (
                  <div key={lr.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{lr.test_name ?? lr.lab_test_id}</p>
                        {lr.result && (
                          <p className="text-sm text-muted-foreground">
                            {lr.result}
                            {lr.unit ? ` ${lr.unit}` : ""}
                          </p>
                        )}
                      </div>
                      {lr.flag && (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            lr.flag === "HIGH" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                            lr.flag === "LOW" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            lr.flag === "NORMAL" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                            lr.flag === "ABNORMAL" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                            (!lr.flag || !["HIGH", "LOW", "NORMAL", "ABNORMAL"].includes(lr.flag))
                              && "bg-muted text-muted-foreground",
                          )}
                        >
                          {lr.flag ?? t("noFlag")}
                        </span>
                      )}
                    </div>

                    {lr.notes && (
                      <p className="text-xs text-muted-foreground">{lr.notes}</p>
                    )}

                    {(() => {
                      const culture = lr.id ? cultureByLabResultId.get(lr.id) : null;
                      if (!culture) return null;
                      return (
                        <div className="rounded-lg border border-dashed p-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {t("cultureResult")}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                culture.growth_status === "NO_GROWTH"
                                  && "bg-green-100 text-green-700",
                                culture.growth_status === "GROWTH"
                                  && "bg-red-100 text-red-700",
                                culture.growth_status === "CONTAMINATED"
                                  && "bg-amber-100 text-amber-700",
                                culture.growth_status === "PENDING"
                                  && "bg-muted text-muted-foreground",
                              )}
                            >
                              {t(`cultureStatus.${culture.growth_status}`)}
                            </span>
                            {culture.organism_name && (
                              <span className="text-sm font-medium">{culture.organism_name}</span>
                            )}
                            {culture.colony_count && (
                              <span className="text-xs text-muted-foreground">{culture.colony_count}</span>
                            )}
                          </div>
                          {culture.notes && (
                            <p className="text-xs text-muted-foreground">{culture.notes}</p>
                          )}
                          {(culture.sensitivity?.length ?? 0) > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b text-muted-foreground">
                                    <th className="pb-1 text-left font-medium">{t("cultureAntibiotic")}</th>
                                    <th className="pb-1 text-left font-medium">MIC</th>
                                    <th className="pb-1 text-left font-medium">{t("cultureInterpretation")}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {culture.sensitivity?.map((s, idx) => (
                                    <tr key={idx}>
                                      <td className="py-1">{s.antibiotic_name}</td>
                                      <td className="py-1 text-muted-foreground">{s.mic_value ?? "—"}</td>
                                      <td className="py-1">
                                        <InterpretationBadge value={s.interpretation} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
