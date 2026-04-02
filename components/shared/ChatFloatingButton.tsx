"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";

export function ChatFloatingButton() {
  const locale = useLocale();
  const pathname = usePathname();
  const unreadChat = useUiStore((state) => state.unreadChat);
  const isRtl = locale === "ar";

  if (pathname.includes("/chat")) return null;

  return (
    <Link
      href={`/${locale}/chat`}
      aria-label="Open chat"
      className={cn(
        "fixed bottom-6 z-50 flex h-14 w-14 items-center justify-center",
        isRtl ? "left-6" : "right-6",
        "rounded-full bg-primary text-primary-foreground shadow-lg",
        "transition-transform hover:scale-105 active:scale-95",
      )}
    >
      <MessageCircle className="h-6 w-6" />
      {unreadChat > 0 ? (
        <span
          className={cn(
            "absolute -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white",
            isRtl ? "-right-1" : "-left-1",
          )}
        >
          {unreadChat > 9 ? "9+" : unreadChat}
        </span>
      ) : null}
    </Link>
  );
}
