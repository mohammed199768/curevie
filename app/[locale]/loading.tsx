import { AppPreloader } from "@/components/shared/AppPreloader";

export default function LocaleLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AppPreloader variant="page" title="Curevie" blockCount={4} />
    </div>
  );
}
