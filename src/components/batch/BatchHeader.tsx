import { useTranslation } from "react-i18next";
import { ROUTES } from "@/routes";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Layers, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type BatchStatus } from "@/hooks/useBatches";
import { BATCH_STATUS_COLORS, BATCH_STATUS_CONFIG } from "@/components/batch/batchConfig";

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
    BATCH_STATUS_CONFIG[batch.status as BatchStatus]?.label ??
    "batches.status.blocked";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.ADMIN.BATCHES)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`${ROUTES.ADMIN.BATCHES}/${batch.id}/edit`)}>
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
        <Badge className={BATCH_STATUS_COLORS[batch.status as BatchStatus]}>
          {t(statusKey)}
        </Badge>
      </div>
    </div>
  );
}
