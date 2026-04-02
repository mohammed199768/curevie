import { apiClient } from "./client";
import { ApiListResponse, NotificationItem } from "./types";

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unread_only?: boolean }) =>
    apiClient.get<ApiListResponse<NotificationItem>>("/notifications", { params }),

  markAllRead: () => apiClient.put<{ message: string; count: number }>("/notifications/read-all"),

  markRead: (id: string) => apiClient.put<NotificationItem>(`/notifications/${id}/read`),
};

