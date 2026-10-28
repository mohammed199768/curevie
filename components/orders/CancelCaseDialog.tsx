"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { casesApi } from "@/lib/api/cases";
import { getOrderErrorMessage } from "@/lib/order-errors";

export function CancelCaseDialog({ caseId }: { caseId: string }) {
  const t = useTranslations("orderDetail");
  const tOrders = useTranslations("orders");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const cancelMutation = useMutation({
    mutationFn: () => casesApi.cancel(caseId, reason),
    onSuccess: (view) => {
      toast.success(t("cancel.success"));
      queryClient.setQueryData(["cases", "detail", caseId], view);
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      setOpen(false);
      setReason("");
    },
    onError: (error) => {
      toast.error(getOrderErrorMessage(error, tOrders));
      void queryClient.invalidateQueries({ queryKey: ["cases", "detail", caseId] });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 rounded-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
          <XCircle className="h-4 w-4" />
          {t("cancel.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle>{t("cancel.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("cancel.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("cancel.reasonPlaceholder")}
        />
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel disabled={cancelMutation.isPending}>{t("cancel.keep")}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("cancel.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
