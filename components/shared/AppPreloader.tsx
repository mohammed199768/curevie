import { Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type PreloaderVariant = "page" | "panel" | "inline";
type PlaceholderVariant = "card" | "line";

interface AppPreloaderProps {
  variant?: PreloaderVariant;
  title?: string;
  description?: string;
  className?: string;
  blockCount?: number;
  blockVariant?: PlaceholderVariant;
}

function PlaceholderBlock({ variant }: { variant: PlaceholderVariant }) {
  if (variant === "line") {
    return (
      <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-sm">
        <div className="h-2.5 w-20 animate-pulse rounded-full bg-[rgba(16,77,73,0.14)]" />
        <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[rgba(16,77,73,0.08)]" />
        <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-[rgba(16,77,73,0.08)]" />
      </div>
    );
  }

  return (
    <div className="rounded-[1.55rem] border border-white/70 bg-white/75 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="h-2.5 w-20 animate-pulse rounded-full bg-[rgba(16,77,73,0.14)]" />
        <div className="h-9 w-9 animate-pulse rounded-2xl bg-[rgba(16,77,73,0.08)]" />
      </div>
      <div className="mt-5 h-6 w-2/3 animate-pulse rounded-full bg-[rgba(16,77,73,0.1)]" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded-full bg-[rgba(16,77,73,0.08)]" />
      <div className="mt-2 h-3.5 w-5/6 animate-pulse rounded-full bg-[rgba(16,77,73,0.08)]" />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="h-16 animate-pulse rounded-[1.1rem] bg-[rgba(16,77,73,0.06)]" />
        <div className="h-16 animate-pulse rounded-[1.1rem] bg-[rgba(16,77,73,0.06)]" />
      </div>
    </div>
  );
}

export function AppPreloader({
  variant = "page",
  title = "Curevie",
  description,
  className,
  blockCount = 3,
  blockVariant,
}: AppPreloaderProps) {
  if (variant === "inline") {
    return (
      <div
        aria-live="polite"
        className={cn(
          "inline-flex min-h-11 items-center gap-3 rounded-full border border-[rgba(16,77,73,0.12)] bg-white/90 px-4 py-2 text-sm text-[var(--brand-primary)] shadow-[0_20px_50px_-40px_rgba(16,77,73,0.38)] backdrop-blur",
          className,
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(16,77,73,0.08)] text-[var(--brand-primary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
        <span className="font-medium">{title}</span>
      </div>
    );
  }

  const resolvedBlockVariant = blockVariant || (variant === "page" ? "card" : "line");

  return (
    <div
      aria-live="polite"
      className={cn(
        "relative overflow-hidden border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,250,247,0.98)_100%)] shadow-[0_34px_96px_-62px_rgba(16,77,73,0.34)]",
        variant === "page" ? "min-h-[420px] rounded-[2rem] p-5 sm:p-7" : "rounded-[1.7rem] p-5 sm:p-6",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-primary)_0%,var(--brand-accent)_100%)]" />
      <div className="pointer-events-none absolute -right-10 top-8 h-32 w-32 rounded-full border border-white/70 perf-drift-slow" />
      <div className="pointer-events-none absolute -left-8 bottom-8 h-24 w-24 rounded-full border border-white/60 perf-drift-reverse" />
      <div className="pointer-events-none absolute right-[18%] top-[30%] h-20 w-20 rounded-full bg-[rgba(134,171,98,0.1)] blur-2xl" />

      <div className="relative">
        <div className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[rgba(16,77,73,0.12)] bg-white/88 px-4 py-2 text-sm shadow-sm backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(16,77,73,0.08)] text-[var(--brand-primary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[rgba(16,77,73,0.72)]">
                Curevie
              </span>
              <Shield className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
            </div>
          </div>
        </div>

        <div className="mt-5 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--brand-primary)] sm:text-[2rem]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-xl text-sm leading-7 text-[rgba(48,74,67,0.78)] sm:text-[0.95rem]">
              {description}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-6 grid gap-3",
            resolvedBlockVariant === "card" ? "lg:grid-cols-2" : "md:grid-cols-2",
          )}
        >
          {Array.from({ length: blockCount }).map((_, index) => (
            <PlaceholderBlock key={`preloader-block-${index}`} variant={resolvedBlockVariant} />
          ))}
        </div>
      </div>
    </div>
  );
}
