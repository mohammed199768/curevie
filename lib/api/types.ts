export type UserRole = "ADMIN" | "PROVIDER" | "PATIENT";
export type RequestStatus =
  | "PENDING"
  | "ACCEPTED" // Legacy only. New workflow should not set this.
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";
export type RequestType = "PATIENT" | "GUEST";
export type ServiceType = "MEDICAL" | "LAB" | "RADIOLOGY" | "PACKAGE";
export type ReportStatus = "DRAFT" | "PUBLISHED";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type PaymentStatusDetail = "UNPAID" | "PARTIAL" | "PAID";
export type WorkflowStage =
  | "TRIAGE"
  | "IN_PROGRESS"
  | "WAITING_SUB_REPORTS"
  | "DOCTOR_REVIEW"
  | "COMPLETED"
  | "PUBLISHED";
export type RequestChatRoomType = "CARE_TEAM" | "PATIENT_CARE" | "DOCTOR_ADMIN" | "PROVIDER_PATIENT";
export type RequestChatMessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
export type ProviderReportType = "SUB_REPORT" | "FINAL_REPORT";
export type ProviderReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  total_pages?: number;
  pages?: number;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: ApiPagination;
  unread_count?: number;
}

export interface PatientUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  secondary_phone?: string | null;
  role: "PATIENT";
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  total_points?: number;
}

export interface LoginResponse {
  access_token: string;
  user: PatientUser;
  token_type?: string;
  expires_in?: string;
  message?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  price?: number;
  cost?: number;
  total_cost?: number;
  category_name?: string | null;
  service_kind?: "MEDICAL" | "RADIOLOGY";
  is_active?: boolean;
}

export interface LabTestItem {
  id: string;
  name: string;
  description?: string | null;
  cost?: number;
  unit?: string | null;
  reference_range?: string | null;
  display_reference_range?: string | null;
  sample_type?: string | null;
  category_name?: string | null;
  is_active?: boolean;
}

export interface LabPanelItem {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string | null;
  description_ar?: string | null;
  price?: number;
  sample_types?: string | null;
  turnaround_hours?: number | null;
  is_active?: boolean;
  tests_count?: number;
  test_ids?: string[];
  tests?: Array<{
    id: string;
    name: string;
    description?: string | null;
    cost: number;
    unit: string | null;
    reference_range: string | null;
    display_reference_range?: string | null;
    sample_type?: string | null;
    display_order?: number;
  }>;
}

export interface LabPackageItem {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string | null;
  description_ar?: string | null;
  price?: number;
  is_active?: boolean;
  tests_count?: number;
  panels_count?: number;
  test_ids?: string[];
  panel_ids?: string[];
  tests?: Array<{
    id: string;
    name: string;
    description?: string | null;
    cost: number;
    unit: string | null;
    reference_range: string | null;
    display_reference_range?: string | null;
    sample_type?: string | null;
  }>;
  panels?: LabPanelItem[];
}

export interface PackageItem {
  id: string;
  name: string;
  description?: string | null;
  total_cost?: number;
  category_name?: string | null;
  is_active?: boolean;
  test_ids?: string[];
  service_ids?: string[];
  tests?: Array<{
    id: string;
    name: string;
    cost: number;
    unit: string | null;
    reference_range: string | null;
    display_reference_range?: string | null;
  }>;
  services?: Array<{
    id: string;
    name: string;
    price: number;
    description?: string | null;
    category_id?: string | null;
    category_name?: string | null;
    service_kind?: "MEDICAL" | "RADIOLOGY";
  }>;
}

export interface ServiceOptionBase {
  id: string;
  name?: string;
  name_en?: string;
  name_ar?: string;
  price?: number;
  cost?: number;
  total_cost?: number;
  description?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
}

export type ServiceOption =
  ServiceOptionBase & (ServiceItem | LabTestItem | LabPanelItem | LabPackageItem | PackageItem);

export interface CreateRequestPayload {
  request_type: "PATIENT" | "GUEST";
  patient_id?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_address?: string;
  service_type: ServiceType;
  service_id?: string | null;
  lab_test_id?: string | null;
  lab_panel_id?: string | null;
  lab_package_id?: string | null;
  package_id?: string | null;
  notes?: string | null;
  coupon_code?: string | null;
}

export interface RequestItem {
  id: string;
  request_id?: string;
  invoice_id?: string | null;
  request_type: RequestType;
  patient_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_address: string | null;
  guest_gender?: string | null;
  guest_age?: number | null;
  service_type: ServiceType;
  service_id: string | null;
  lab_test_id: string | null;
  lab_panel_id?: string | null;
  lab_package_id?: string | null;
  package_id: string | null;
  status: RequestStatus;
  assigned_provider_id: string | null;
  notes: string | null;
  admin_notes: string | null;
  requested_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string | null;
  patient_phone?: string | null;
  patient_email?: string | null;
  patient_address?: string | null;
  provider_name?: string | null;
  provider_type?: string | null;
  service_name?: string | null;
  service_price?: number | string | null;
  service_description?: string | null;
  service_category_name?: string | null;
  lab_panel_name?: string | null;
  lab_package_name?: string | null;
  workflow_stage?: WorkflowStage | null;
  workflow_updated_at?: string | null;
  lead_provider_id?: string | null;
  final_report_confirmed_by?: string | null;
  final_report_confirmed_at?: string | null;
  original_amount?: number | string;
  final_amount?: number | string;
  payment_status?: PaymentStatus;
  payment_status_detail?: PaymentStatusDetail | null;
  total_paid?: number | string;
  remaining_amount?: number | string;
  is_patient_visible?: boolean | null;
  in_progress_at?: string | null;
  closed_at?: string | null;
  collected_amount?: number | string | null;
  collected_method?: "CASH" | "TRANSFER" | null;
  collected_notes?: string | null;
  collected_at?: string | null;
}

export interface LabResult {
  id: string;
  request_id: string;
  lab_test_id: string;
  result: string;
  is_normal: boolean | null;
  notes: string | null;
  created_at: string;
  entered_by: string | null;
  test_name?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
}

export interface RequestDetails extends RequestItem {
  lab_results: LabResult[];
  package_tests?: Array<{
    lab_test_id: string;
    name?: string | null;
    unit?: string | null;
    reference_range?: string | null;
    display_reference_range?: string | null;
  }>;
  package_services?: Array<{
    service_id: string;
    name?: string | null;
    service_kind?: "MEDICAL" | "RADIOLOGY";
    category_name?: string | null;
  }>;
}

export interface RequestProviderReport {
  id: string;
  request_id: string;
  provider_id: string;
  provider_name?: string | null;
  provider_type?: string | null;
  task_id: string | null;
  report_type: ProviderReportType;
  status: ProviderReportStatus;
  service_type?: string | null;
  symptoms_summary: string | null;
  procedures_performed: string | null;
  procedures_done?: string | null;
  allergies_noted: string | null;
  patient_allergies?: string | null;
  findings: string | null;
  diagnosis: string | null;
  recommendations: string | null;
  treatment_plan: string | null;
  lab_notes?: string | null;
  imaging_notes?: string | null;
  image_url?: string | null;
  pdf_report_url?: string | null;
  nurse_notes?: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RequestLifecycleEvent {
  id: string;
  request_id: string;
  actor_id: string | null;
  actor_role: "ADMIN" | "PROVIDER" | "PATIENT" | "SYSTEM";
  actor_name: string | null;
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  workflow_stage_snapshot: WorkflowStage | null;
  created_at: string;
}

export interface RequestChatRoom {
  id: string;
  request_id: string;
  room_type: RequestChatRoomType;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RequestChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_role: "ADMIN" | "PROVIDER" | "PATIENT";
  sender_name: string | null;
  message_type: RequestChatMessageType;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  is_read: boolean;
  created_at: string;
}

export interface RequestChatMessagesResponse {
  room: RequestChatRoom;
  data: RequestChatMessage[];
  pagination: ApiPagination;
}

export interface ReportStatusData {
  id: string;
  request_id: string;
  status: ReportStatus;
  version: number;
  published_at: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  request_id: string;
  patient_id: string | null;
  guest_name: string | null;
  original_amount: number | string;
  vip_discount_amount?: number | string;
  coupon_discount_amount: number | string;
  points_used: number;
  points_discount_amount: number | string;
  final_amount: number | string;
  total_paid: number | string;
  remaining_amount: number | string;
  payment_status: PaymentStatus;
  payment_status_detail?: PaymentStatusDetail | null;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at: string;
  service_name?: string | null;
  service_type?: ServiceType;
  patient_name?: string | null;
  patient_phone?: string | null;
  coupon_code?: string | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  user_role: UserRole;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  patient_name: string;
  participant_id: string;
  participant_role: "ADMIN" | "PROVIDER";
  participant_name: string | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  last_message: Message | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: UserRole;
  body: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "file" | null;
  is_read: boolean;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  participant_name: string;
  participant_role: "ADMIN" | "PROVIDER";
}

export interface PointsLogItem {
  id?: string;
  type: string;
  amount: number;
  points?: number;
  reason?: string;
  note?: string | null;
  reference_id?: string;
  source?: string;
  created_at: string;
}
