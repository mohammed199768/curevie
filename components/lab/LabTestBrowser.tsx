"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, type InfiniteData, type UseInfiniteQueryResult } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FlaskConical,
  Loader2,
  Microscope,
  Plus,
  Search,
  Star,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ForwardChevron } from "@/components/app/ui";
import { formatCurrency } from "@/lib/formatting";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  fetchLabGroups,
  fetchLabTestsPage,
  LAB_SEARCH_DEBOUNCE_MS,
  LAB_SEARCH_MIN_LENGTH,
  type LabGroup,
  type LabTestEntry,
  type LabTestsPage,
  type LabTestsQuery,
} from "@/lib/lab-catalog";
import { cn } from "@/lib/utils";

type Tone = "public" | "app";

/** "public" keeps the light look of the marketing pages; "app" follows the dashboard theme (dark mode included). */
const TONES: Record<Tone, { card: string; title: string; muted: string; soft: string; input: string }> = {
  public: {
    card: "border border-[#e3ece7] bg-white shadow-[0_18px_44px_-36px_rgba(15,79,72,0.35)]",
    title: "text-[#12312d]",
    muted: "text-[#617672]",
    soft: "bg-[#eef4f1] text-[#12312d]",
    input: "border border-[#dbe6e0] bg-white text-[#12312d] placeholder:text-[#8a9b96]",
  },
  app: {
    card: "app-card",
    title: "text-foreground",
    muted: "text-muted-foreground",
    soft: "bg-[#f1f5f4] text-foreground dark:bg-white/5",
    input: "border border-[var(--app-card-border)] bg-card text-foreground placeholder:text-muted-foreground",
  },
};

type View =
  | { kind: "home" }
  | { kind: "specialized" }
  | { kind: "group"; group: LabGroup; from: "home" | "specialized" };

type TestsQuery = UseInfiniteQueryResult<InfiniteData<LabTestsPage>, Error>;

function useLabTests(key: string, query: Omit<LabTestsQuery, "page">, locale: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["lab-tests", key, locale],
    queryFn: ({ pageParam }) => fetchLabTestsPage({ ...query, page: pageParam }, locale),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export interface LabTestBrowserProps {
  isSelected: (id: string) => boolean;
  onToggle: (entry: LabTestEntry) => void;
  /** The order already holds the maximum number of items: unpicked tests cannot be added. */
  limitReached?: boolean;
  tone?: Tone;
  className?: string;
}

/**
 * Lab tests as a simple tree: search, "most requested", the groups, then one entry for the specialised
 * groups. Every list shows 10 tests and grows with "show more"; a whole group is never loaded at once.
 */
export function LabTestBrowser({ isSelected, onToggle, limitReached = false, tone = "app", className }: LabTestBrowserProps) {
  const locale = useLocale();
  const t = useTranslations("labCatalog");
  const styles = TONES[tone];
  const [view, setView] = useState<View>({ kind: "home" });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), LAB_SEARCH_DEBOUNCE_MS);
  const searching = debouncedSearch.length >= LAB_SEARCH_MIN_LENGTH;
  const topRef = useRef<HTMLDivElement>(null);
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const groupsQuery = useQuery({
    queryKey: ["lab-groups", false, locale],
    queryFn: () => fetchLabGroups(false, locale),
    staleTime: 10 * 60 * 1000,
  });
  const specializedGroupsQuery = useQuery({
    queryKey: ["lab-groups", true, locale],
    queryFn: () => fetchLabGroups(true, locale),
    staleTime: 10 * 60 * 1000,
    enabled: view.kind === "specialized",
  });

  const popularQuery = useLabTests("popular", { popular: true }, locale, view.kind === "home" && !searching);
  const groupId = view.kind === "group" ? view.group.id : "";
  const groupQuery = useLabTests(`group:${groupId}`, { categoryId: groupId }, locale, Boolean(groupId) && !searching);
  const searchQuery = useLabTests(`search:${debouncedSearch}`, { search: debouncedSearch }, locale, searching);

  // Opening a group (or going back) starts from the top of the browser, not the middle of the old list.
  const viewKey = view.kind === "group" ? view.group.id : view.kind;
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [viewKey]);

  const openGroup = (group: LabGroup, from: "home" | "specialized") => setView({ kind: "group", group, from });

  const renderGroups = (groups: LabGroup[], from: "home" | "specialized") => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          onClick={() => openGroup(group, from)}
          className={cn(
            "app-press flex min-h-[76px] w-full items-center gap-3 rounded-2xl p-3.5 text-start transition-shadow hover:shadow-md",
            styles.card,
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef5e6] text-[#4a6b32]">
            <FlaskConical className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[15.5px] font-bold leading-6", styles.title)}>{group.name}</span>
            {group.description ? (
              <span className={cn("mt-0.5 line-clamp-1 block text-[13px] leading-5", styles.muted)}>{group.description}</span>
            ) : null}
            <span className="mt-1 block text-[12.5px] font-semibold text-[#5a7a50]">
              {t("testsCount", { count: group.activeCount })}
            </span>
          </span>
          <ForwardChevron className={cn("h-4 w-4 shrink-0", styles.muted)} />
        </button>
      ))}
    </div>
  );

  const listProps = { isSelected, onToggle, limitReached, styles, locale };

  return (
    <div ref={topRef} className={cn("scroll-mt-24 space-y-4", className)}>
      <div className="relative">
        <Search className={cn("pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2", styles.muted)} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          enterKeyHint="search"
          className={cn(
            "h-[52px] w-full rounded-2xl pe-12 ps-12 text-[16px] shadow-sm outline-none ring-[#86ab62] focus:ring-2 [&::-webkit-search-cancel-button]:hidden",
            styles.input,
          )}
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label={t("clearSearch")}
            className={cn("absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-black/5", styles.muted)}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {searching ? (
        <section className="space-y-3">
          <h3 className={cn("px-1 text-[17px] font-bold", styles.title)}>{t("searchResults", { term: debouncedSearch })}</h3>
          <LabTestList query={searchQuery} emptyText={t("searchEmpty")} showGroupName {...listProps} />
        </section>
      ) : search.trim() ? (
        <p className={cn("px-1 text-[14px]", styles.muted)}>{t("searchHint", { min: LAB_SEARCH_MIN_LENGTH })}</p>
      ) : view.kind === "group" ? (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setView(view.from === "specialized" ? { kind: "specialized" } : { kind: "home" })}
            className="app-press inline-flex min-h-11 items-center gap-2 rounded-full bg-[#e6f0ee] px-4 text-[14px] font-semibold text-[#104d49]"
          >
            <BackIcon className="h-4 w-4" />
            {view.from === "specialized" ? t("backToSpecialized") : t("backToGroups")}
          </button>
          <div className="px-1">
            <h3 className={cn("text-[20px] font-bold leading-7", styles.title)}>{view.group.name}</h3>
            {view.group.description ? <p className={cn("mt-1 text-[14px] leading-6", styles.muted)}>{view.group.description}</p> : null}
            <p className="mt-1 text-[13px] font-semibold text-[#5a7a50]">{t("testsCount", { count: view.group.activeCount })}</p>
          </div>
          <LabTestList query={groupQuery} emptyText={t("groupEmpty")} {...listProps} />
        </section>
      ) : view.kind === "specialized" ? (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setView({ kind: "home" })}
            className="app-press inline-flex min-h-11 items-center gap-2 rounded-full bg-[#e6f0ee] px-4 text-[14px] font-semibold text-[#104d49]"
          >
            <BackIcon className="h-4 w-4" />
            {t("backToGroups")}
          </button>
          <div className="px-1">
            <h3 className={cn("text-[20px] font-bold leading-7", styles.title)}>{t("specializedTitle")}</h3>
            <p className={cn("mt-1 text-[14px] leading-6", styles.muted)}>{t("specializedDescription")}</p>
          </div>
          {specializedGroupsQuery.isLoading ? (
            <ListSkeleton rows={2} styles={styles} />
          ) : specializedGroupsQuery.isError ? (
            <LoadError onRetry={() => void specializedGroupsQuery.refetch()} styles={styles} />
          ) : specializedGroupsQuery.data?.length ? (
            renderGroups(specializedGroupsQuery.data, "specialized")
          ) : (
            <p className={cn("rounded-2xl p-4 text-center text-[14px]", styles.card, styles.muted)}>{t("groupEmpty")}</p>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className={cn("flex items-center gap-2 px-1 text-[17px] font-bold", styles.title)}>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {t("popularTitle")}
            </h3>
            <LabTestList query={popularQuery} emptyText={t("popularEmpty")} showGroupName {...listProps} />
          </section>

          <section className="space-y-3">
            <div className="px-1">
              <h3 className={cn("text-[17px] font-bold", styles.title)}>{t("groupsTitle")}</h3>
              <p className={cn("mt-0.5 text-[13.5px] leading-5", styles.muted)}>{t("groupsHint")}</p>
            </div>
            {groupsQuery.isLoading ? (
              <ListSkeleton rows={4} styles={styles} />
            ) : groupsQuery.isError ? (
              <LoadError onRetry={() => void groupsQuery.refetch()} styles={styles} />
            ) : (
              <>
                {renderGroups(groupsQuery.data || [], "home")}
                <button
                  type="button"
                  onClick={() => setView({ kind: "specialized" })}
                  className="app-press flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-dashed border-[#b9cdbf] bg-[#f4f8f1] p-3.5 text-start"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#304a43]">
                    <Microscope className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-bold leading-6 text-[#12312d]">{t("specializedEntry")}</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-[#617672]">{t("specializedEntryHint")}</span>
                  </span>
                  <ForwardChevron className="h-4 w-4 shrink-0 text-[#617672]" />
                </button>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

type Styles = (typeof TONES)[Tone];

function ListSkeleton({ rows, styles }: { rows: number; styles: Styles }) {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={cn("flex items-center gap-3 rounded-2xl p-4", styles.card)}>
          <div className="flex-1 space-y-2">
            <div className="app-shimmer h-4 w-2/3 rounded-xl" />
            <div className="app-shimmer h-3 w-1/2 rounded-xl" />
          </div>
          <div className="app-shimmer h-11 w-11 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function LoadError({ onRetry, styles }: { onRetry: () => void; styles: Styles }) {
  const t = useTranslations("labCatalog");
  return (
    <div className={cn("space-y-3 rounded-2xl p-5 text-center", styles.card)}>
      <p className="text-[15px] text-rose-700">{t("loadError")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="app-press inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#e6f0ee] px-5 text-[14px] font-semibold text-[#104d49]"
      >
        {t("retry")}
      </button>
    </div>
  );
}

function LabTestList({
  query,
  emptyText,
  showGroupName = false,
  isSelected,
  onToggle,
  limitReached,
  styles,
  locale,
}: {
  query: TestsQuery;
  emptyText: string;
  showGroupName?: boolean;
  isSelected: (id: string) => boolean;
  onToggle: (entry: LabTestEntry) => void;
  limitReached: boolean;
  styles: Styles;
  locale: string;
}) {
  const t = useTranslations("labCatalog");

  if (query.isLoading) return <ListSkeleton rows={3} styles={styles} />;
  if (query.isError && !query.data) return <LoadError onRetry={() => void query.refetch()} styles={styles} />;

  const pages = query.data?.pages || [];
  // Pages are cut by the server; if two tests share the same position a test can come back on two pages,
  // so each test is listed once.
  const seen = new Set<string>();
  const entries = pages
    .flatMap((page) => page.entries)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  const total = pages[0]?.total ?? entries.length;

  if (!entries.length) {
    return <p className={cn("rounded-2xl p-5 text-center text-[14.5px] leading-6", styles.card, styles.muted)}>{emptyText}</p>;
  }

  return (
    <div className="space-y-2.5">
      <ul className="grid gap-2.5 md:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <LabTestCard
              entry={entry}
              selected={isSelected(entry.id)}
              disabled={limitReached && !isSelected(entry.id)}
              onToggle={() => onToggle(entry)}
              showGroupName={showGroupName}
              styles={styles}
              locale={locale}
            />
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="app-press flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#e6f0ee] px-5 text-[15px] font-semibold text-[#104d49] disabled:opacity-60"
        >
          {query.isFetchingNextPage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronDown className="h-5 w-5" />}
          {t("showMore")}
        </button>
      ) : null}
      <p className={cn("px-1 text-center text-[12.5px]", styles.muted)} aria-live="polite">
        {t("shownOf", { shown: entries.length, total })}
      </p>
    </div>
  );
}

function LabTestCard({
  entry,
  selected,
  disabled,
  onToggle,
  showGroupName,
  styles,
  locale,
}: {
  entry: LabTestEntry;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  showGroupName: boolean;
  styles: Styles;
  locale: string;
}) {
  const t = useTranslations("labCatalog");
  const [expanded, setExpanded] = useState(false);
  const description = entry.description?.trim();
  // Short descriptions fit on one line; the "read more" control only appears when there is more to read.
  const canExpand = Boolean(description && description.length > 60);

  return (
    <article
      className={cn(
        "flex h-full items-start gap-3 rounded-2xl p-3.5 transition-[box-shadow,border-color]",
        styles.card,
        selected && "border-[#104d49] ring-1 ring-[#104d49]",
      )}
    >
      <div className="min-w-0 flex-1">
        {showGroupName && entry.categoryName ? (
          <p className={cn("text-[12px] font-medium", styles.muted)}>{entry.categoryName}</p>
        ) : null}
        <h4 className={cn("text-[15.5px] font-bold leading-6", styles.title)}>{entry.name}</h4>
        {description ? (
          <div className="mt-0.5">
            <p className={cn("text-[13.5px] leading-5", styles.muted, !expanded && "line-clamp-1")}>{description}</p>
            {canExpand ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="mt-0.5 min-h-8 text-[13px] font-semibold text-[#104d49] underline-offset-2 hover:underline"
              >
                {expanded ? t("readLess") : t("readMore")}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-bold tabular-nums text-[#104d49]">
            {entry.price === null ? t("priceOnRequest") : formatCurrency(entry.price, locale)}
          </span>
          {entry.requiresFasting ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e0] px-2.5 py-1 text-[12px] font-bold text-[#8a5200]">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              {t("fasting")}
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${selected ? t("remove") : t("add")}: ${entry.name}`}
        className={cn(
          "app-press mt-0.5 flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-[13px] font-bold transition-colors disabled:opacity-45",
          selected ? "bg-[#104d49] text-white" : "bg-[#e6f0ee] text-[#104d49]",
        )}
      >
        {selected ? <Check className="h-5 w-5" strokeWidth={2.6} /> : <Plus className="h-5 w-5" strokeWidth={2.4} />}
        <span className="hidden sm:inline">{selected ? t("added") : t("add")}</span>
      </button>
    </article>
  );
}

/** "A home sample-collection visit fee is added once per order" notice. */
export function LabFeeNote({ fee, className }: { fee: number; className?: string }) {
  const locale = useLocale();
  const t = useTranslations("labCatalog");
  if (!(fee > 0)) return null;
  return (
    <p className={cn("flex items-start gap-2 rounded-2xl bg-[#eef5e6] px-3.5 py-2.5 text-[13.5px] leading-5 text-[#3d5a2c]", className)}>
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{t("feeNote", { amount: formatCurrency(fee, locale) })}</span>
    </p>
  );
}
