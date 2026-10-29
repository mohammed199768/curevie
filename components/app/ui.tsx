import Image from "next/image";
import Link from "next/link";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OrderIllustration } from "@/lib/order-stage";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- surfaces */

export function AppCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("app-card", className)} {...props} />;
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-1", className)}>
      <h2 className="text-[17px] font-bold text-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function PageIntro({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 px-1", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- illustrations */

const ILLUSTRATION_SIZES: Record<OrderIllustration, { width: number; height: number }> = {
  welcome: { width: 426, height: 611 },
  "nurse-arrival": { width: 499, height: 632 },
  "on-the-way": { width: 648, height: 560 },
  "lab-sample": { width: 599, height: 593 },
  "order-placed": { width: 487, height: 505 },
  "empty-orders": { width: 578, height: 552 },
  "payment-cliq": { width: 525, height: 557 },
  "no-notifications": { width: 342, height: 307 },
};

export function Illustration({
  name,
  className,
  priority,
  sizes = "(max-width: 768px) 50vw, 320px",
}: {
  name: OrderIllustration;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const size = ILLUSTRATION_SIZES[name];
  return (
    <Image
      src={`/illustrations/${name}.webp`}
      alt=""
      aria-hidden="true"
      width={size.width}
      height={size.height}
      sizes={sizes}
      priority={priority}
      className={cn("pointer-events-none select-none object-contain", className)}
    />
  );
}

/* -------------------------------------------------------------------------- icons & rows */

export function IconBubble({
  icon: Icon,
  tone = "teal",
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: "teal" | "sage" | "amber" | "rose" | "stone" | "sky";
  className?: string;
}) {
  const tones: Record<string, string> = {
    teal: "bg-[#e6f0ee] text-[#104d49] dark:bg-teal-500/15 dark:text-teal-200",
    sage: "bg-[#eef5e6] text-[#4a6b32] dark:bg-lime-500/15 dark:text-lime-200",
    amber: "bg-[#fff4e0] text-[#9a5b00] dark:bg-amber-500/15 dark:text-amber-200",
    rose: "bg-[#fdecec] text-[#b42318] dark:bg-rose-500/15 dark:text-rose-200",
    stone: "bg-[#eff1f1] text-[#5b6366] dark:bg-white/10 dark:text-slate-200",
    sky: "bg-[#e8f1fb] text-[#1d5fa8] dark:bg-sky-500/15 dark:text-sky-200",
  };

  return (
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tones[tone], className)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** Direction-aware "go forward" chevron. */
export function ForwardChevron({ className }: { className?: string }) {
  return (
    <>
      <ChevronRight className={cn("h-5 w-5 rtl:hidden", className)} aria-hidden="true" />
      <ChevronLeft className={cn("hidden h-5 w-5 rtl:block", className)} aria-hidden="true" />
    </>
  );
}

export function DetailRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 py-3", className)}>
      {Icon ? (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f4] text-[#104d49] dark:bg-white/5 dark:text-teal-200">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-[15px] font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function AmountRow({
  label,
  value,
  strong,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  tone?: "default" | "positive" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={cn("text-[15px]", strong ? "font-bold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "text-[15px] tabular-nums",
          strong ? "text-[17px] font-bold text-foreground" : "font-semibold text-foreground",
          tone === "positive" && "text-[#3f7a3a] dark:text-lime-300",
          tone === "muted" && "font-medium text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- empty & loading */

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: {
  illustration?: OrderIllustration;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <AppCard className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {illustration ? <Illustration name={illustration} className="h-40 w-auto" /> : null}
      <h2 className="mt-5 text-[19px] font-bold text-foreground">{title}</h2>
      {description ? <p className="mt-2 max-w-sm text-[15px] leading-7 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6 flex w-full max-w-xs flex-col gap-2">{action}</div> : null}
    </AppCard>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn("app-shimmer rounded-xl", className)} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <AppCard key={index} className="flex items-center gap-3 p-4">
          <Shimmer className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-2/3" />
            <Shimmer className="h-3 w-1/3" />
          </div>
          <Shimmer className="h-7 w-20 rounded-full" />
        </AppCard>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <AppCard className="space-y-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-3">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-7 w-3/4" />
            <Shimmer className="h-4 w-1/2" />
          </div>
          <Shimmer className="h-28 w-28 rounded-3xl" />
        </div>
        <Shimmer className="h-2.5 w-full rounded-full" />
      </AppCard>
      <AppCard className="space-y-3 p-5">
        <Shimmer className="h-5 w-1/3" />
        <Shimmer className="h-14 w-full rounded-2xl" />
        <Shimmer className="h-14 w-full rounded-2xl" />
      </AppCard>
      <AppCard className="space-y-3 p-5">
        <Shimmer className="h-5 w-1/4" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
      </AppCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- buttons */

const buttonBase =
  "app-press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86ab62] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0";

export const appButton = {
  primary: cn(buttonBase, "bg-[#104d49] text-white shadow-[0_10px_24px_-12px_rgba(16,77,73,0.7)] hover:bg-[#0d4440]"),
  secondary: cn(
    buttonBase,
    "border border-[#dbe6e0] bg-card text-foreground hover:bg-[#f1f5f4] dark:border-border dark:hover:bg-white/5",
  ),
  soft: cn(buttonBase, "bg-[#e6f0ee] text-[#104d49] hover:bg-[#dbe9e6] dark:bg-teal-500/15 dark:text-teal-100"),
  danger: cn(
    buttonBase,
    "border border-rose-200 bg-card text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10",
  ),
  ghost: cn(buttonBase, "min-h-11 px-3 text-[#104d49] hover:bg-[#e6f0ee] dark:text-teal-200 dark:hover:bg-white/5"),
};

export function ListLink({
  href,
  icon,
  tone,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Parameters<typeof IconBubble>[0]["tone"];
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Link href={href} className="app-press flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-[#f7faf9] dark:hover:bg-white/5">
      <IconBubble icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
        {subtitle ? <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {trailing}
      <ForwardChevron className="text-muted-foreground/70" />
    </Link>
  );
}
