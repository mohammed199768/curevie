import { ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
}

export interface DataTableAction<T> {
  label: string;
  onClick: (row: T) => void;
  destructive?: boolean;
  disabled?: (row: T) => boolean;
}

interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: DataTablePagination;
  actions?: DataTableAction<T>[];
  className?: string;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const valueA = typeof a === "string" ? a.toLowerCase() : a;
  const valueB = typeof b === "string" ? b.toLowerCase() : b;

  if (valueA < valueB) return -1;
  if (valueA > valueB) return 1;
  return 0;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 6,
  emptyTitle = "No records found",
  emptyDescription,
  pagination,
  actions,
  className,
}: DataTableProps<T>) {
  const t = useTranslations("common");
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedData = useMemo(() => {
    if (!sort) return data;

    const column = columns.find((item) => item.key === sort.key);
    if (!column || !column.sortable) return data;

    const accessor =
      column.sortValue ??
      ((row: T) => {
        const value = row[column.key as keyof T];
        if (typeof value === "string" || typeof value === "number") {
          return value;
        }
        return String(value ?? "");
      });

    const copy = [...data];

    copy.sort((left, right) => {
      const result = compareValues(accessor(left), accessor(right));
      return sort.direction === "asc" ? result : result * -1;
    });

    return copy;
  }, [columns, data, sort]);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  const onToggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    setSort((prev) => {
      if (!prev || prev.key !== column.key) {
        return { key: column.key, direction: "asc" };
      }

      if (prev.direction === "asc") {
        return { key: column.key, direction: "desc" };
      }

      return null;
    });
  };

  const renderSortIcon = (column: DataTableColumn<T>) => {
    if (!column.sortable) return null;
    if (!sort || sort.key !== column.key) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/80" />;
    if (sort.direction === "asc") return <ChevronUp className="h-3.5 w-3.5" />;
    return <ChevronDown className="h-3.5 w-3.5" />;
  };

  const hasActions = Boolean(actions?.length);

  if (loading && data.length === 0) {
    return (
      <AppPreloader
        variant="panel"
        title={t("loading")}
        blockCount={Math.max(2, Math.min(skeletonRows, 4))}
        blockVariant="line"
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onToggleSort(column)}
                    className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
                  >
                    <span>{column.header}</span>
                    {renderSortIcon(column)}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
            {hasActions ? <TableHead className="w-12 text-right">{t("actions")}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
              {hasActions ? (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions?.map((action) => (
                        <DropdownMenuItem
                          key={action.label}
                          disabled={action.disabled?.(row)}
                          onClick={() => action.onClick(row)}
                          className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {!loading && sortedData.length === 0 ? (
        <div className="py-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : null}

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
          <Badge variant="secondary">{t("totalCount", { count: pagination.total })}</Badge>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              {t("prev")}
            </Button>
            <span className="text-muted-foreground">
              {t("pageOf", { page: pagination.page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages || loading}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

