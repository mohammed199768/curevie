import { apiClient } from "./client";
import { ApiListResponse, ChatParticipant, Conversation, Message } from "./types";

export const chatApi = {
  participants: () => apiClient.get<{ data: ChatParticipant[] }>("/chat/participants"),

  createConversation: (participant_id: string, participant_role: "ADMIN" | "PROVIDER") =>
    apiClient.post<Conversation>("/chat/conversations", { participant_id, participant_role }),

  getConversations: () => apiClient.get<{ data: Conversation[] }>("/chat/conversations"),

  getMessages: (conversationId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiListResponse<Message>>(`/chat/conversations/${conversationId}/messages`, { params }),

  sendMessage: (conversationId: string, data: { body?: string; file?: File }) => {
    if (!data.file) {
      return apiClient.post<Message>(`/chat/conversations/${conversationId}/messages`, {
        body: data.body,
      });
    }

    const formData = new FormData();
    if (data.body) {
      formData.append("body", data.body);
    }
    formData.append("file", data.file);

    return apiClient.post<Message>(`/chat/conversations/${conversationId}/messages`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  markRead: (conversationId: string) =>
    apiClient.put<{ message: string; updated_count: number }>(`/chat/conversations/${conversationId}/read`),
};

