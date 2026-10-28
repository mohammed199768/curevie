"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@/lib/api/cases";
import { createAppSocket, type AppSocket } from "@/lib/socket-client";
import { useUiStore } from "@/lib/stores/ui.store";

type RealtimeContextValue = {
  socket: AppSocket | null;
  connected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue>({ socket: null, connected: false });

type CaseUpdatedPayload = { case_id?: string };
type UnreadPayload = { unread_count?: number };

/**
 * One socket.io connection for the authenticated patient area. Server events keep React Query caches
 * fresh so pages do not need to poll.
 */
export function RealtimeProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const queryClient = useQueryClient();
  const setUnreadNotifications = useUiStore((state) => state.setUnreadNotifications);
  const setUnreadChat = useUiStore((state) => state.setUnreadChat);
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const nextSocket = createAppSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleCaseUpdated = (payload: CaseUpdatedPayload = {}) => {
      void queryClient.invalidateQueries({ queryKey: ["cases", "list"] });
      if (payload.case_id) {
        void queryClient.invalidateQueries({ queryKey: ["cases", "detail", payload.case_id] });
        void queryClient.invalidateQueries({ queryKey: ["cases", "invoice", payload.case_id] });
        void queryClient.invalidateQueries({ queryKey: ["cases", "report", payload.case_id] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["cases"] });
      }
      void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    };

    const handleNotificationUnread = (payload: UnreadPayload = {}) => {
      const unreadCount = Number(payload.unread_count || 0);
      queryClient.setQueryData(["notifications", "unread-count"], unreadCount);
      setUnreadNotifications(unreadCount);
      void queryClient.invalidateQueries({ queryKey: ["notifications"], predicate: (query) => query.queryKey[1] !== "unread-count" });
    };

    const handleChatUnread = (payload: UnreadPayload = {}) => {
      const unreadCount = Number(payload.unread_count || 0);
      queryClient.setQueryData(["chat", "unread"], unreadCount);
      setUnreadChat(unreadCount);
      void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    };

    const handleNewMessage = (message?: ChatMessage) => {
      if (!message?.id || !message.room_id) return;

      queryClient.setQueryData<ChatMessage[]>(["chat", "messages", message.room_id], (current) => {
        if (!current) return current;
        return current.some((item) => item.id === message.id) ? current : [...current, message];
      });
      void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.on("case:updated", handleCaseUpdated);
    nextSocket.on("notification_unread_updated", handleNotificationUnread);
    nextSocket.on("chat_unread_updated", handleChatUnread);
    nextSocket.on("new_message", handleNewMessage);
    nextSocket.connect();
    setSocket(nextSocket);

    return () => {
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [enabled, queryClient, setUnreadChat, setUnreadNotifications]);

  return <RealtimeContext.Provider value={{ socket, connected }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
