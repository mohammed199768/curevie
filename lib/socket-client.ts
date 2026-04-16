"use client";

const SOCKET_IO_CDN = "https://cdn.socket.io/4.7.5/socket.io.min.js";
const DEFAULT_API_BASE_URL = "http://localhost:5000/api/v1";

export type AppSocket = {
  connected?: boolean;
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  disconnect: () => void;
};

type SocketFactory = (url: string, opts?: unknown) => AppSocket;

let socketIoFactoryPromise: Promise<SocketFactory | null> | null = null;

export function getSocketUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL)
    .trim()
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");
}

export function loadSocketFactory() {
  if (typeof window === "undefined") {
    return Promise.resolve<SocketFactory | null>(null);
  }

  const currentWindow = window as Window & { io?: SocketFactory };
  if (currentWindow.io) {
    return Promise.resolve(currentWindow.io);
  }

  if (!socketIoFactoryPromise) {
    socketIoFactoryPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = SOCKET_IO_CDN;
      script.async = true;
      script.onload = () => resolve((window as Window & { io?: SocketFactory }).io || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  return socketIoFactoryPromise;
}

export async function connectAppSocket(accessToken: string) {
  const factory = await loadSocketFactory();
  if (!factory) {
    return null;
  }

  return factory(getSocketUrl(), {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
  });
}
