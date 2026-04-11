"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Send, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { casesApi } from "@/lib/api/cases";
import { useAuthStore } from "@/lib/stores/auth.store";
import { cn, formatDateTime } from "@/lib/utils";

const SOCKET_IO_CDN = "https://cdn.socket.io/4.7.5/socket.io.min.js";
const DEFAULT_API_BASE_URL = "http://localhost:5000/api/v1";

type SocketLike = {
  connected?: boolean;
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  disconnect: () => void;
};

type SocketFactory = (url: string, options?: unknown) => SocketLike;

let socketIoFactoryPromise: Promise<SocketFactory | null> | null = null;

function getSocketUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL)
    .trim()
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");
}

function loadSocketFactory(): Promise<SocketFactory | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as unknown as { io?: SocketFactory }).io) {
    return Promise.resolve((window as unknown as { io: SocketFactory }).io);
  }
  if (!socketIoFactoryPromise) {
    socketIoFactoryPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = SOCKET_IO_CDN;
      script.async = true;
      script.onload = () => resolve((window as unknown as { io?: SocketFactory }).io || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return socketIoFactoryPromise;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_role: "PATIENT" | "PROVIDER" | "ADMIN";
  content?: string | null;
  created_at: string;
}

interface ChatRoom {
  id: string;
  case_service_id: string;
  service_name: string;
  provider_name: string;
  patient_name: string;
  case_id?: string;
}

interface PatientCase {
  id: string;
  status: string;
  services?: Array<{ service_name: string }>;
}

export default function PatientChatPage() {
  const locale = useLocale();
  const t = useTranslations("casesPage");
  const tCommon = useTranslations("common");
  const accessToken = useAuthStore((s) => s.accessToken);

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef<SocketLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all cases for this patient
  const casesQuery = useQuery({
    queryKey: ["patient-chat", "cases"],
    queryFn: async () => {
      const result = await casesApi.list({ limit: 100 });
      return result.data?.data ?? [];
    },
  });

  const cases = (casesQuery.data ?? []) as PatientCase[];

  // Fetch chat rooms for selected case
  const roomsQuery = useQuery({
    queryKey: ["patient-chat", "rooms", selectedCaseId],
    queryFn: async () => {
      const result = await casesApi.getChatRooms(selectedCaseId);
      return (result.data?.data ?? []) as ChatRoom[];
    },
    enabled: Boolean(selectedCaseId),
  });

  // Fetch messages for selected room
  const messagesQuery = useQuery({
    queryKey: ["patient-chat", "messages", selectedRoomId],
    queryFn: async () => {
      const result = await casesApi.getChatMessages(selectedRoomId, { limit: 100 });
      return (result.data?.data ?? []) as ChatMessage[];
    },
    enabled: Boolean(selectedRoomId),
  });

  useEffect(() => {
    setMessages(messagesQuery.data ?? []);
  }, [messagesQuery.data, selectedRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select first case
  useEffect(() => {
    if (!selectedCaseId && cases.length > 0) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  // Auto-select first room
  useEffect(() => {
    const rooms = roomsQuery.data ?? [];
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [roomsQuery.data, selectedRoomId]);

  // Socket connection
  useEffect(() => {
    if (!selectedRoomId || !accessToken) {
      setSocketReady(false);
      return;
    }

    let cancelled = false;
    let activeSocket: SocketLike | null = null;

    void (async () => {
      const factory = await loadSocketFactory();
      if (cancelled || !factory) return;

      const socket = factory(getSocketUrl(), {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
      });

      activeSocket = socket;
      socketRef.current = socket;

      socket.on("connect", () => {
        if (cancelled) return;
        socket.emit("join_room", { room_id: selectedRoomId });
      });

      socket.on("joined_room", () => {
        if (!cancelled) setSocketReady(true);
      });

      socket.on("new_message", (payload: unknown) => {
        const msg = payload as ChatMessage;
        if (!msg?.id || msg.room_id !== selectedRoomId) return;
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      });

      if (socket.connected) {
        socket.emit("join_room", { room_id: selectedRoomId });
      }
    })();

    return () => {
      cancelled = true;
      setSocketReady(false);
      activeSocket?.disconnect();
    };
  }, [accessToken, selectedRoomId]);

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !selectedRoomId || !socketRef.current) return;
    socketRef.current.emit("send_message", {
      room_id: selectedRoomId,
      content: trimmed,
    });
    setMessageText("");
  };

  const rooms = (roomsQuery.data ?? []) as ChatRoom[];

  const getRoleBadgeClass = (role: ChatMessage["sender_role"]) => {
    if (role === "PATIENT") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (role === "PROVIDER") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  if (casesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!cases.length) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 pt-6">
          <MessageSquareText className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t("noChat")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Cases sidebar */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {cases.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCaseId(c.id);
                setSelectedRoomId("");
                setMessages([]);
              }}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition",
                selectedCaseId === c.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              )}
            >
              <p className="font-medium">#{c.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">{c.status}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Chat area */}
      <div className="space-y-3">
        {/* Room tabs */}
        {rooms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setMessages([]);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  selectedRoomId === room.id
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {room.service_name || room.provider_name}
              </button>
            ))}
          </div>
        )}

        <Card className="flex flex-col" style={{ minHeight: "500px" }}>
          {/* Messages */}
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {!selectedRoomId ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("noChat")}</p>
              </div>
            ) : messagesQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : messages.length ? (
              messages.map((msg) => (
                <div key={msg.id} className="rounded-xl border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-medium", getRoleBadgeClass(msg.sender_role))}
                    >
                      {msg.sender_role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(msg.created_at, "dd/MM/yyyy HH:mm", locale)}
                    </span>
                  </div>
                  {msg.content && (
                    <p className="mt-2 text-sm leading-6">{msg.content}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("noChat")}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          {selectedRoomId && (
            <div className="border-t p-4 space-y-3">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t("typeMessage")}
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {socketReady ? "✓ متصل" : "جاري الاتصال..."}
                </p>
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || !socketReady}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("sendMessage")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
