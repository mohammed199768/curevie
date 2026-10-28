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
        <Button type="button" size="sm" variant="outline" className="rounded-full">
          <Star className="h-4 w-4" />
          {t("rating.rate")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
              className="rounded-full p-1 transition hover:scale-110"
            >
              <Star className={cn("h-8 w-8", value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </button>
          ))}
        </div>

        <Textarea
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("rating.commentPlaceholder")}
        />

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t("rating.cancel")}
          </Button>
          <Button type="button" onClick={() => rateMutation.mutate()} disabled={!rating || rateMutation.isPending}>
            {rateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("rating.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
