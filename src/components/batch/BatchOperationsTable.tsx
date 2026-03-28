import { useTranslation } from "react-i18next";
import { Package, Play, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BatchOperation {
  id: string;
  operation?: {
    operation_name?: string;
    status?: string;
    part?: {
      part_number?: string;
      quantity?: number;
      job?: {
        job_number?: string;
      };
    };
  };
}

interface BatchOperationsTableProps {
  operations: BatchOperation[] | undefined;
}

export function BatchOperationsTable({ operations }: BatchOperationsTableProps) {
  const { t } = useTranslation();
  const operationsCount = operations?.length || 0;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t("batches.selectOperations")} ({operationsCount})
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" disabled>
                <Plus className="mr-2 h-4 w-4" />
                {t("operations.addOperation")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("batches.addOperationNotAvailable")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        {operations && operations.length > 0 ? (
          <div className="space-y-3">
            {operations.map((bo, index) => (
              <div
                key={bo.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium">
                      {bo.operation?.operation_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {bo.operation?.part?.job?.job_number} ·{" "}
                      {bo.operation?.part?.part_number}
                      {bo.operation?.part?.quantity &&
                        ` · ${t("parts.qty")}: ${bo.operation.part.quantity}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bo.operation?.status === "completed" ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-500"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {t("operations.status.completed")}
                    </Badge>
                  ) : bo.operation?.status === "in_progress" ? (
                    <Badge
                      variant="secondary"
                      className="bg-orange-500/10 text-orange-500"
                    >
                      <Play className="mr-1 h-3 w-3" />
                      {t("operations.status.inProgress")}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {t("operations.status.notStarted")}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            {t("batches.noOperationsAvailable")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
