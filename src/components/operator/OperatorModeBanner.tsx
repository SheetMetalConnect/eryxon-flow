import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type {
  OperatorTerminalMode,
  OperatorTerminalWorkModeSettings,
} from "@/features/operator-terminal/workModes";

interface TerminalModeCounts {
  blockedSetup: number;
  blockedWorkingHours: number;
  readyForSetup: number;
  readyForProduction: number;
  inSetup: number;
  inProduction: number;
}

interface OperatorModeBannerProps {
  settings: OperatorTerminalWorkModeSettings;
  currentMode: OperatorTerminalMode;
  workingHoursActive: boolean;
  counts: TerminalModeCounts;
  onModeChange: (mode: OperatorTerminalMode) => void;
}

const MODE_ORDER: Array<{
  mode: OperatorTerminalMode;
  labelKey: string;
  hidden?: (settings: OperatorTerminalWorkModeSettings) => boolean;
}> = [
  { mode: "not_working", labelKey: "terminal.workModes.modes.notWorking" },
  {
    mode: "setup",
    labelKey: "terminal.workModes.modes.setup",
    hidden: (settings) => !settings.setupPrepEnabled,
  },
  { mode: "production", labelKey: "terminal.workModes.modes.production" },
];

export function OperatorModeBanner({
  settings,
  currentMode,
  workingHoursActive,
  counts,
  onModeChange,
}: OperatorModeBannerProps) {
  const { t } = useTranslation();

  if (!settings.enabled) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t("terminal.workModes.title")}
            </span>
            <Badge
              variant="outline"
              className={cn(
                workingHoursActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600",
              )}
            >
              {workingHoursActive
                ? t("terminal.workModes.workingHoursActive")
                : t("terminal.workModes.outsideWorkingHours")}
            </Badge>
            <Badge variant="secondary">
              {t(`terminal.workModes.modes.${currentMode}`)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("terminal.workModes.description")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {MODE_ORDER.filter((item) => !item.hidden?.(settings)).map((item) => (
            <Button
              key={item.mode}
              type="button"
              variant={currentMode === item.mode ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange(item.mode)}
            >
              {t(item.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{t("terminal.workModes.summary.readyForSetup", { count: counts.readyForSetup })}</span>
        <span>{t("terminal.workModes.summary.readyForProduction", { count: counts.readyForProduction })}</span>
        <span>{t("terminal.workModes.summary.blockedSetup", { count: counts.blockedSetup })}</span>
        {settings.enforceWorkingHours ? (
          <span>
            {t("terminal.workModes.summary.blockedWorkingHours", {
              count: counts.blockedWorkingHours,
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
