import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Layers, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type BatchStatus } from "@/hooks/useBatches";

const STATUS_COLORS: Record<BatchStatus, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  ready: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
};

export { STATUS_COLORS };

interface BatchHeaderProps {
  batch: {
    id: string;
    batch_number: string;
    status: string;
    material?: string | null;
    thickness_mm?: number | null;
    cell?: { name: string } | null;
  };
}

export function BatchHeader({ batch }: BatchHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const statusKey =
    batch.status === "draft"
      ? "batches.status.draft"
      : batch.status === "ready"
        ? "batches.status.ready"
        : batch.status === "in_progress"
          ? "batches.status.inProgress"
          : batch.status === "completed"
            ? "batches.status.completed"
            : batch.status === "cancelled"
              ? "batches.status.cancelled"
              : "batches.status.blocked";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/batches")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/batches/${batch.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("batches.editBatch")}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layers className="h-7 w-7" />
            {batch.batch_number}
          </h1>
          <p className="text-muted-foreground mt-1">
            {batch.cell?.name}
            {batch.material && ` · ${batch.material}`}
            {batch.thickness_mm && ` (${batch.thickness_mm}mm)`}
          </p>
        </div>
        <Badge className={STATUS_COLORS[batch.status as BatchStatus]}>
          {t(statusKey)}
        </Badge>
      </div>
    </div>
  );
}
