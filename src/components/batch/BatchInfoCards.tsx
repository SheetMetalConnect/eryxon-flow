import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

interface BatchInfoCardsProps {
  batchType: string;
  actualTime: number | null | undefined;
}

export function BatchInfoCards({ batchType, actualTime }: BatchInfoCardsProps) {
  const { t } = useTranslation();

  const typeKey = `batches.types.${
    batchType === "laser_nesting"
      ? "laserNesting"
      : batchType === "tube_batch"
        ? "tubeBatch"
        : batchType === "saw_batch"
          ? "sawBatch"
          : batchType === "finishing_batch"
            ? "finishingBatch"
            : "general"
  }`;

  return (
    <Card className="glass-card">
      <CardContent className="pt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("batches.type")}
          </p>
          <p className="font-medium mt-1">
            {t(typeKey)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t("batches.timeTracking.totalTime")}
          </p>
          <p className="font-medium mt-1">
            {actualTime
              ? `${actualTime} ${t("operations.min")}`
              : "-"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
