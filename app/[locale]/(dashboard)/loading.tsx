import { AppPreloader } from "@/components/shared/AppPreloader";

export default function DashboardSegmentLoading() {
  return (
    <div className="space-y-5">
      <AppPreloader variant="page" title="Curevie" blockCount={4} />
    </div>
  );
}
