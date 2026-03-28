import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_COLORS } from "@/components/batch/BatchHeader";
import { type BatchStatus } from "@/hooks/useBatches";

interface SubBatch {
  id: string;
  batch_number: string;
  material?: string | null;
  status: BatchStatus;
  operations_count?: number;
}

interface BatchSubBatchesProps {
  parentBatchId: string;
  subBatches: SubBatch[] | undefined;
}

export function BatchSubBatches({ parentBatchId, subBatches }: BatchSubBatchesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          {t("batches.nestedBatchesSheets")}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/batches/new?parentId=${parentBatchId}`)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("batches.addSheet")}
        </Button>
      </CardHeader>
      <CardContent>
        {subBatches && subBatches.length > 0 ? (
          <div className="space-y-2">
            {subBatches.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/admin/batches/${sub.id}`)}>
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{sub.batch_number}</span>
                  {sub.material && <span className="text-sm text-muted-foreground">({sub.material})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sub.operations_count} ops</Badge>
                  <Badge className={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4 text-sm">{t("No nested batches yet.")}</p>
        )}
      </CardContent>
    </Card>
  );
}
