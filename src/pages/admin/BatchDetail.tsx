import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBatch,
  useBatchOperations,
  useSubBatches,
  useBatchRequirements,
} from "@/hooks/useBatches";
import { useBatchActiveTimer } from "@/hooks/useBatchTimeTracking";
import { BatchHeader } from "@/components/batch/BatchHeader";
import { BatchVisuals } from "@/components/batch/BatchVisuals";
import { BatchRequirements } from "@/components/batch/BatchRequirements";
import { BatchInfoCards } from "@/components/batch/BatchInfoCards";
import { BatchMetadata } from "@/components/batch/BatchMetadata";
import { BatchSubBatches } from "@/components/batch/BatchSubBatches";
import { BatchTimeTracking } from "@/components/batch/BatchTimeTracking";
import { BatchOperationsTable } from "@/components/batch/BatchOperationsTable";
import { BatchStatusActions } from "@/components/batch/BatchStatusActions";

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: batch, isLoading: batchLoading } = useBatch(id);
  const { data: batchOperations, isLoading: opsLoading } = useBatchOperations(id);
  const { data: subBatches } = useSubBatches(id);
  const { data: requirements } = useBatchRequirements(id);
  const { data: activeTimer } = useBatchActiveTimer(id);

  if (batchLoading || opsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Clock className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="outline" onClick={() => navigate("/admin/batches")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("batches.backToBatches")}
        </Button>
        <p className="mt-4 text-muted-foreground">{t("batches.notFound")}</p>
      </div>
    );
  }

  const operationsCount = batchOperations?.length || 0;
  const isTimerActive = !!activeTimer?.isActive;
  const showSubBatches =
    (subBatches && subBatches.length > 0) || batch.batch_type === "laser_nesting";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <BatchHeader batch={batch} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BatchVisuals batch={batch} />
        <div className="space-y-6">
          <BatchRequirements batchId={batch.id} requirements={requirements} />
          <BatchInfoCards batchType={batch.batch_type} actualTime={batch.actual_time} />
        </div>
      </div>

      <BatchMetadata metadata={batch.nesting_metadata} />

      {showSubBatches && (
        <BatchSubBatches parentBatchId={batch.id} subBatches={subBatches} />
      )}

      <BatchTimeTracking
        batchId={batch.id}
        batchStatus={batch.status}
        actualTime={batch.actual_time}
        operationsCount={operationsCount}
      />

      <BatchOperationsTable operations={batchOperations} />

      <BatchStatusActions
        batchId={batch.id}
        batchStatus={batch.status}
        isTimerActive={isTimerActive}
      />
    </div>
  );
}
