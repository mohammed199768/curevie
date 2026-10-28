"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** avatar_url values are absolute URLs; anything else (legacy relative paths) falls back to initials. */
export function ProviderAvatar({ name, url, className }: { name?: string | null; url?: string | null; className?: string }) {
  const src = url && /^https?:\/\//i.test(url) ? url : undefined;

  return (
    <Avatar className={cn("h-11 w-11", className)}>
      {src ? <AvatarImage src={src} alt={name || ""} className="object-cover" /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
