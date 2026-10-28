export type UserRole = "ADMIN" | "PROVIDER" | "PATIENT";

/** Money values arrive from the API as NUMERIC strings with 3 decimals (e.g. "25.000"). */
export type MoneyValue = number | string;

export type ServiceKind = "MEDICAL" | "NURSING" | "RADIOLOGY" | "LAB";

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
  area_id?: string | null;
  is_vip?: boolean;
  vip_discount?: MoneyValue | null;
  avatar_url?: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: PatientUser;
  token_type?: string;
  expires_in?: string | number;
  message?: string;
}

export interface Area {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  city?: string | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  price?: MoneyValue;
  category_id?: string | null;
  category_name?: string | null;
  service_kind?: ServiceKind;
  image_url?: string | null;
  is_active?: boolean;
  is_vip_exclusive?: boolean;
}

/** A service as listed inside a package (GET /packages). */
export interface PackageServiceItem {
  id: string;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  price?: MoneyValue;
  service_kind?: ServiceKind;
  is_active?: boolean;
}

/** Fixed-price bundle of services (GET /packages). */
export interface PackageItem {
  id: string;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  total_cost?: MoneyValue;
  category_id?: string | null;
  category_name?: string | null;
  is_vip_exclusive?: boolean;
  is_active?: boolean;
  image_url?: string | null;
  services?: PackageServiceItem[];
  services_count?: number;
  /** Sum of the included services' prices. */
  items_total?: MoneyValue;
  /** items_total - total_cost, never negative. */
  savings?: MoneyValue;
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
