import { Move, Layers, Triangle, Circle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { MeasurementResult } from './types';

interface MeasurementPanelProps {
  results: MeasurementResult[];
  onDelete: (id: string) => void;
}

const TYPE_ICONS = {
  'point-to-point': Move,
  'face-distance': Layers,
  'face-angle': Triangle,
  'radius': Circle,
} as const;

const TYPE_COLORS = {
  'point-to-point': 'text-blue-400',
  'face-distance': 'text-green-400',
  'face-angle': 'text-yellow-400',
  'radius': 'text-purple-400',
} as const;

const TYPE_BG = {
  'point-to-point': 'bg-blue-500/10',
  'face-distance': 'bg-green-500/10',
  'face-angle': 'bg-yellow-500/10',
  'radius': 'bg-purple-500/10',
} as const;

function formatResult(r: MeasurementResult): string {
  switch (r.type) {
    case 'point-to-point':
      return `${r.distance.toFixed(2)} mm`;
    case 'face-distance':
      return `${r.distance.toFixed(2)} mm`;
    case 'face-angle':
      return `${r.includedAngleDeg.toFixed(1)}\u00B0`;
    case 'radius':
      return `R ${r.radius.toFixed(2)} mm`;
  }
}

function formatDetail(r: MeasurementResult): string | null {
  switch (r.type) {
    case 'face-distance':
      return r.isParallel ? 'Perpendicular' : 'Non-parallel';
    case 'face-angle':
      return `Bend: ${r.bendAngleDeg.toFixed(1)}\u00B0`;
    case 'radius':
      return `\u2300 ${r.diameter.toFixed(2)} mm`;
    default:
      return null;
  }
}

function formatTypeLabel(r: MeasurementResult): string {
  switch (r.type) {
    case 'point-to-point': return 'Distance';
    case 'face-distance': return 'Thickness';
    case 'face-angle': return 'Angle';
    case 'radius': return 'Radius';
  }
}

export function MeasurementPanel({ results, onDelete }: MeasurementPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const prevCountRef = useRef(results.length);

  // Auto-expand when a new measurement is added
  useEffect(() => {
    if (results.length > prevCountRef.current) {
      setCollapsed(false);
    }
    prevCountRef.current = results.length;
  }, [results.length]);

  if (results.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-10">
      <div className={cn(
        "glass-card overflow-hidden min-w-[220px] max-w-[280px] transition-opacity duration-200",
        collapsed ? "opacity-80" : "opacity-95"
      )}>
        {/* Header - clickable to collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground">
              {t('parts.cadViewer.measurements.title')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
              {results.length}
            </span>
            {collapsed
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronUp className="h-3 w-3 text-muted-foreground" />
            }
          </div>
        </button>

        {/* Results list */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <div className="space-y-1">
              {results.map((r) => {
                const Icon = TYPE_ICONS[r.type];
                const colorClass = TYPE_COLORS[r.type];
                const bgClass = TYPE_BG[r.type];
                const detail = formatDetail(r);

                return (
                  <div
                    key={r.id}
                    className={cn(
                      'group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
                      bgClass
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', colorClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-mono font-semibold text-foreground tabular-nums">
                          {formatResult(r)}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          {formatTypeLabel(r)}
                        </span>
                      </div>
                      {detail && (
                        <span className="text-[10px] text-muted-foreground">
                          {detail}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer disclaimer */}
            <div className="border-t border-border/30 mt-2 pt-2 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground">
                  {t('parts.cadViewer.measurements.meshDisclaimer')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
