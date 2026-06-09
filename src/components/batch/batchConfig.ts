import {
  CheckCircle2,
  CircleDot,
  Layers,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import type { BatchStatus, BatchType } from "@/hooks/useBatches";

/**
 * Shared presentation config for batches. The list page, batch header, and
 * sub-batch list previously kept their own copies of these maps; keep them
 * here so status styling and labels can't drift between surfaces.
 * Labels are i18n keys in the `jobs` namespace (`batches.*`).
 */

export const BATCH_TYPE_CONFIG: Record<BatchType, { label: string; icon: LucideIcon; color: string }> = {
  laser_nesting: { label: "batches.types.laserNesting", icon: Scissors, color: "text-orange-500" },
  tube_batch: { label: "batches.types.tubeBatch", icon: CircleDot, color: "text-blue-500" },
  saw_batch: { label: "batches.types.sawBatch", icon: Scissors, color: "text-yellow-500" },
  finishing_batch: { label: "batches.types.finishingBatch", icon: CheckCircle2, color: "text-green-500" },
  general: { label: "batches.types.general", icon: Layers, color: "text-gray-500" },
};

export const BATCH_STATUS_CONFIG: Record<BatchStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "batches.status.draft", variant: "outline" },
  ready: { label: "batches.status.ready", variant: "secondary" },
  in_progress: { label: "batches.status.inProgress", variant: "default" },
  completed: { label: "batches.status.completed", variant: "secondary" },
  cancelled: { label: "batches.status.cancelled", variant: "destructive" },
  blocked: { label: "batches.status.blocked", variant: "destructive" },
};

/** Badge color classes for batch status chips. */
export const BATCH_STATUS_COLORS: Record<BatchStatus, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  ready: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
};
