"use client";

import { io, type Socket } from "socket.io-client";
import { handleSessionExpired, refreshAccessToken } from "@/lib/api/client";
import { API_ORIGIN } from "@/lib/env";
import { useAuthStore } from "@/lib/stores/auth.store";

export type AppSocket = Socket;

const AUTH_ERROR_PATTERN = /(authentication required|invalid token|token revoked)/i;
const MAX_AUTH_RETRIES = 3;

/**
 * Opens the realtime connection to the API origin. The handshake always reads the latest in-memory
 * access token, and when the server drops the socket because the token expired (or rejects the
 * handshake), the token is refreshed and the socket reconnects with the new one.
 */
export function createAppSocket(): AppSocket {
  const socket = io(API_ORIGIN, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    withCredentials: true,
    auth: (callback) => callback({ token: useAuthStore.getState().accessToken || "" }),
  });

  let refreshing = false;
  let consecutiveAuthFailures = 0;

  socket.on("connect", () => {
    consecutiveAuthFailures = 0;
  });

  const refreshAndReconnect = async () => {
    if (refreshing) return;
    // Stop retrying (REST keeps working with its own fallback refetch) if the server keeps rejecting fresh tokens.
    if (consecutiveAuthFailures >= MAX_AUTH_RETRIES) return;
    consecutiveAuthFailures += 1;
    refreshing = true;

    try {
      await refreshAccessToken();
      if (!socket.connected) {
        socket.connect();
      }
    } catch {
      socket.disconnect();
      handleSessionExpired();
    } finally {
      refreshing = false;
    }
  };

  socket.on("disconnect", (reason) => {
    // "io server disconnect" is what the backend does when the access token expires.
    // socket.io does not reconnect on its own in that case.
    if (reason === "io server disconnect") {
      void refreshAndReconnect();
    }
  });

  socket.on("connect_error", (error) => {
    if (AUTH_ERROR_PATTERN.test(error?.message || "")) {
      void refreshAndReconnect();
    }
  });

  return socket;
}
