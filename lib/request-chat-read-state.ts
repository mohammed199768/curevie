"use client";

export const REQUEST_CHAT_LAST_SEEN_STORAGE_KEY = "patient-request-chat-last-seen";

export type RequestChatLastSeenMap = Record<string, string>;

export function readRequestChatLastSeenMap(): RequestChatLastSeenMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(REQUEST_CHAT_LAST_SEEN_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as RequestChatLastSeenMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function markRequestChatSeen(requestId: string, seenAt?: string | null) {
  if (typeof window === "undefined" || !requestId) return;

  const normalizedSeenAt = seenAt || new Date().toISOString();
  const current = readRequestChatLastSeenMap();
  current[requestId] = normalizedSeenAt;
  window.localStorage.setItem(REQUEST_CHAT_LAST_SEEN_STORAGE_KEY, JSON.stringify(current));
}
