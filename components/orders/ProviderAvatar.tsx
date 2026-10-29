"use client";

import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ARABIC = /[؀-ۿ]/;

function initials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || ""
  );
}

/** avatar_url values are absolute URLs; anything else (legacy relative paths) falls back to initials or an icon. */
export function ProviderAvatar({ name, url, className }: { name?: string | null; url?: string | null; className?: string }) {
  const src = url && /^https?:\/\//i.test(url) ? url : undefined;
  // Arabic names (often prefixed with a title such as "د." or "الممرضة") do not make readable initials.
  const letters = name && !ARABIC.test(name) ? initials(name) : "";

  return (
    <Avatar className={cn("h-11 w-11", className)}>
      {src ? <AvatarImage src={src} alt={name || ""} className="object-cover" /> : null}
      <AvatarFallback className="bg-[#e6f0ee] font-bold text-[#104d49] dark:bg-teal-500/15 dark:text-teal-100">
        {letters || <UserRound className="h-1/2 w-1/2" />}
      </AvatarFallback>
    </Avatar>
  );
}
