"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { casesApi } from "@/lib/api/cases";
import { getOrderErrorMessage } from "@/lib/order-errors";
import { cn } from "@/lib/utils";

export function RateServiceDialog({
  caseId,
  serviceId,
  serviceName,
  providerName,
}: {
  caseId: string;
  serviceId: string;
  serviceName: string;
  providerName?: string | null;
}) {
  const t = useTranslations("orderDetail");
  const tOrders = useTranslations("orders");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const rateMutation = useMutation({
    mutationFn: () => casesApi.rateService(caseId, serviceId, { rating, comment }),
    onSuccess: async () => {
      toast.success(t("rating.success"));
      setOpen(false);
      setRating(0);
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["cases", "detail", caseId] });
    },
    onError: (error) => toast.error(getOrderErrorMessage(error, tOrders)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 rounded-full border-[#f3e2b5] bg-[#fffaf0] px-4 text-[14px] font-semibold text-[#7a5300] hover:bg-[#fff4e0] dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {t("rating.rate")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] rounded-[24px] p-6 sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>{t("rating.title")}</DialogTitle>
          <DialogDescription>
            {providerName ? t("rating.descriptionWithProvider", { service: serviceName, provider: providerName }) : serviceName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1 py-2" role="radiogroup" aria-label={t("rating.title")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t("rating.stars", { count: value })}
              onClick={() => setRating(value)}
              className="rounded-full p-1.5 transition hover:scale-110 active:scale-95"
            >
              <Star className={cn("h-9 w-9", value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </button>
          ))}
        </div>

        <Textarea
          className="rounded-2xl text-[16px]"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("rating.commentPlaceholder")}
        />

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" className="min-h-12 rounded-2xl" onClick={() => setOpen(false)}>
            {t("rating.cancel")}
          </Button>
          <Button type="button" className="min-h-12 rounded-2xl" onClick={() => rateMutation.mutate()} disabled={!rating || rateMutation.isPending}>
            {rateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("rating.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
