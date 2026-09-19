import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PendingOperationSwitch } from "@/hooks/operator-terminal/useTerminalActions";

interface OperationSwitchDialogProps {
  pendingSwitch: PendingOperationSwitch | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function OperationSwitchDialog({
  pendingSwitch,
  isPending,
  onCancel,
  onConfirm,
}: OperationSwitchDialogProps) {
  const { t } = useTranslation();
  const current = pendingSwitch
    ? `${pendingSwitch.from.jobCode} · ${pendingSwitch.from.currentOp}`
    : "";
  const next = pendingSwitch
    ? `${pendingSwitch.to.jobCode} · ${pendingSwitch.to.currentOp}`
    : "";

  return (
    <AlertDialog open={Boolean(pendingSwitch)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("terminal.switch.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("terminal.switch.description", { current, next })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={() => void onConfirm()}>
            {t("terminal.switch.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
