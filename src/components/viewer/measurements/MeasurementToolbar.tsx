import { Button } from '@/components/ui/button';
import { Move, Layers, Triangle, Circle, Trash2, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { MeasurementMode, MeasurementPhase } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MeasurementToolbarProps {
  mode: MeasurementMode;
  phase: MeasurementPhase;
  onModeChange: (mode: MeasurementMode) => void;
  onClearAll: () => void;
  measurementCount: number;
  disabled?: boolean;
}

const MODES: {
  key: MeasurementMode;
  icon: typeof Move;
  titleKey: string;
  shortcut: string;
}[] = [
  { key: 'point-to-point', icon: Move,     titleKey: 'parts.cadViewer.measurements.pointToPoint', shortcut: 'Distance' },
  { key: 'face-distance',  icon: Layers,   titleKey: 'parts.cadViewer.measurements.faceDistance',  shortcut: 'Thickness' },
  { key: 'face-angle',     icon: Triangle, titleKey: 'parts.cadViewer.measurements.angle',         shortcut: 'Angle' },
  { key: 'radius',         icon: Circle,   titleKey: 'parts.cadViewer.measurements.radius',        shortcut: 'Radius' },
];

export function MeasurementToolbar({
  mode,
  phase,
  onModeChange,
  onClearAll,
  measurementCount,
  disabled = false,
}: MeasurementToolbarProps) {
  const { t } = useTranslation();
  const isActive = mode !== 'none';

  return (
    <TooltipProvider delayDuration={300}>
      {/* Measurement group indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-0.5 rounded-md px-0.5 transition-colors',
            isActive && 'bg-amber-500/10'
          )}>
            <div className={cn(
              'h-7 w-7 flex items-center justify-center rounded-md',
              isActive ? 'text-amber-600' : 'text-muted-foreground'
            )}>
              <Ruler className="h-3 w-3" />
            </div>

            {MODES.map(({ key, icon: Icon, titleKey, shortcut }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onModeChange(key)}
                    disabled={disabled}
                    className={cn(
                      'h-7 w-7 p-0 transition-all',
                      mode === key
                        ? 'bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30'
                        : 'hover:text-amber-600'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>{t(titleKey)}</span>
                    <kbd className="text-[10px] bg-muted-foreground/20 px-1 py-0.5 rounded font-mono">
                      {shortcut}
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t('parts.cadViewer.measurements.title')}
        </TooltipContent>
      </Tooltip>

      {/* Measurement count badge + clear */}
      {measurementCount > 0 && (
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] tabular-nums text-amber-600 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">
            {measurementCount}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {t('parts.cadViewer.measurements.clearAll')}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </TooltipProvider>
  );
}
