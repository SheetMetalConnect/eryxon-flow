import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QrCode, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RoutingVisualization } from "@/components/qrm/RoutingVisualization";
import { IssuesSummarySection } from "@/components/issues/IssuesSummarySection";
import { useTranslation } from "react-i18next";

interface PartDetailsTabProps {
  partId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  part: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cells: any[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operations: any[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routing: any;
  routingLoading: boolean;
  drawingNo: string;
  setDrawingNo: (value: string) => void;
  cncProgramName: string;
  setCncProgramName: (value: string) => void;
  isBulletCard: boolean;
  setIsBulletCard: (value: boolean) => void;
  handleFieldChange: (setter: (value: string) => void, value: string) => void;
  setHasChanges: (value: boolean) => void;
}

export function PartDetailsTab({
  partId,
  part,
  cells,
  operations,
  routing,
  routingLoading,
  drawingNo,
  setDrawingNo,
  cncProgramName,
  setCncProgramName,
  isBulletCard,
  setIsBulletCard,
  handleFieldChange,
  setHasChanges,
}: PartDetailsTabProps) {
  const { t } = useTranslation();

  const operationsCount = operations?.length || 0;
  const completedOps = operations?.filter((op: { status: string }) => op.status === "completed").length || 0;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.material")}</p>
          <p className="mt-1 font-semibold text-sm">{part?.material || '-'}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.quantity")}</p>
          <p className="mt-1 font-semibold text-sm">{part?.quantity}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("operations.title")}</p>
          <p className="mt-1 font-semibold text-sm">{completedOps}/{operationsCount}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("parts.currentCell")}</p>
          <div className="mt-1">
            {(() => {
              const cell = (cells || []).find((c: { id: string }) => c.id === part?.current_cell_id);
              return cell ? (
                <Badge variant="outline" style={{ borderColor: cell.color, backgroundColor: `${cell.color}20` }}>
                  {cell.name}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              );
            })()}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">{t("qrm.routing")}</h3>
        <div className="border rounded-lg p-3 bg-muted/20">
          <RoutingVisualization routing={routing} loading={routingLoading} />
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/20">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          {t("parts.manufacturingInfo")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="drawing-no" className="text-xs text-muted-foreground">{t("parts.drawingNo")}</Label>
            <Input
              id="drawing-no"
              value={drawingNo}
              onChange={(e) => handleFieldChange(setDrawingNo, e.target.value)}
              placeholder={t("parts.drawingNoPlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cnc-program" className="text-xs text-muted-foreground">{t("parts.cncProgramName")}</Label>
            <Input
              id="cnc-program"
              value={cncProgramName}
              onChange={(e) => handleFieldChange(setCncProgramName, e.target.value)}
              placeholder={t("parts.cncProgramPlaceholder")}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between p-3 border rounded-md bg-card">
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${isBulletCard ? 'text-destructive' : 'text-muted-foreground'}`} />
              <Label htmlFor="bullet-card" className="cursor-pointer text-sm">{t("parts.bulletCard")}</Label>
            </div>
            <Switch id="bullet-card" checked={isBulletCard} onCheckedChange={(checked) => { setIsBulletCard(checked); setHasChanges(true); }} />
          </div>
          {cncProgramName && (
            <div className="sm:col-span-2 flex items-center gap-4 p-3 border rounded-md bg-white">
              <QRCodeSVG value={cncProgramName} size={64} level="M" includeMargin={false} />
              <div>
                <p className="font-mono font-bold text-foreground">{cncProgramName}</p>
                <p className="text-xs text-muted-foreground">{t("parts.qrCodeDesc")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <IssuesSummarySection partId={partId} />
    </div>
  );
}
