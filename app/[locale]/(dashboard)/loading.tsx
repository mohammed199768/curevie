import { ListSkeleton, Shimmer } from "@/components/app/ui";

export default function DashboardSegmentLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Shimmer className="h-40 w-full rounded-[26px]" />
      <ListSkeleton rows={3} />
    </div>
  );
}
