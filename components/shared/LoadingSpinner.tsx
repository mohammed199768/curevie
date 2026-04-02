import { AppPreloader } from "@/components/shared/AppPreloader";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label, className }: LoadingSpinnerProps) {
  return <AppPreloader variant="inline" title={label} className={className} />;
}
