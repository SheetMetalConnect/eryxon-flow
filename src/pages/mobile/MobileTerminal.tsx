import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Factory,
  Loader2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOperationsWithDetails,
  type OperationWithDetails,
} from "@/lib/database";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { MobileTopBar, PullToRefresh } from "@/components/mobile";

interface CellState {
  id: string;
  name: string;
  color: string | null;
  active: number;
  queued: number;
  onHold: number;
  rush: number;
  topOperation: OperationWithDetails | null;
}

/**
 * Mobile-friendly version of the desktop "terminal view" — shows every
 * production cell, what's running, what's waiting, and any rush jobs.
 * Designed for floor managers walking the shop with an iPhone.
 */
export default function MobileTerminal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const data = await fetchOperationsWithDetails(profile.tenant_id);
      setOperations(data);
    } catch (error) {
      logger.error("MobileTerminal", "Failed to load", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    if (!profile?.tenant_id) return () => { cancelled = true; };
    const channel = supabase
      .channel("mobile-terminal")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "operations",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [load, profile?.tenant_id]);

  const cells = useMemo<CellState[]>(() => {
    const map = new Map<string, CellState>();
    operations.forEach((op) => {
      const cell = map.get(op.cell.id) ?? {
        id: op.cell.id,
        name: op.cell.name,
        color: op.cell.color,
        active: 0,
        queued: 0,
        onHold: 0,
        rush: 0,
        topOperation: null,
      };
      if (op.status === "in_progress") cell.active += 1;
      else if (op.status === "on_hold") cell.onHold += 1;
      else cell.queued += 1;
      if (op.part?.is_bullet_card) cell.rush += 1;
      // Pick the most relevant operation to surface: in-progress wins, else
      // the lowest-sequence queued op, else any rush op.
      if (
        !cell.topOperation ||
        (cell.topOperation.status !== "in_progress" &&
          op.status === "in_progress") ||
        (cell.topOperation.status !== "in_progress" &&
          op.sequence < cell.topOperation.sequence)
      ) {
        cell.topOperation = op;
      }
      map.set(op.cell.id, cell);
    });
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [operations]);

  return (
    <div className="flex h-full flex-col">
      <MobileTopBar title={t("navigation.terminalView", "Terminal View")} />
      <PullToRefresh onRefresh={load} className="flex-1 px-3 pb-4 pt-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : cells.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Factory className="h-8 w-8" />
            <p className="text-sm">
              {t("terminal.empty", "No cells configured yet")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 pb-4">
            {cells.map((cell) => (
              <li
                key={cell.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/60"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (cell.topOperation)
                      navigate(`/m/op/${cell.topOperation.id}`);
                  }}
                  className="flex w-full items-stretch gap-3 px-4 py-3 text-left active:bg-muted/30"
                >
                  <div
                    className="w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: cell.color || "hsl(var(--primary))",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate text-base font-semibold">
                        {cell.name}
                      </h2>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <Pill
                        icon={<PlayCircle className="h-3 w-3" />}
                        label={`${cell.active} active`}
                        tone={cell.active > 0 ? "amber" : "muted"}
                      />
                      <Pill
                        label={`${cell.queued} queued`}
                        tone="muted"
                      />
                      {cell.onHold > 0 ? (
                        <Pill
                          icon={<PauseCircle className="h-3 w-3" />}
                          label={`${cell.onHold} hold`}
                          tone="orange"
                        />
                      ) : null}
                      {cell.rush > 0 ? (
                        <Pill
                          label={`${cell.rush} rush`}
                          tone="red"
                        />
                      ) : null}
                    </div>
                    {cell.topOperation ? (
                      <div className="mt-2 truncate text-[12px] text-muted-foreground">
                        <span className="font-mono">
                          {cell.topOperation.part.job.job_number}
                        </span>
                        <span> · </span>
                        <span>{cell.topOperation.operation_name}</span>
                      </div>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PullToRefresh>
    </div>
  );
}

function Pill({
  icon,
  label,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  tone: "muted" | "amber" | "orange" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-px font-medium",
        tone === "muted" && "bg-muted/40 text-muted-foreground",
        tone === "amber" &&
          "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        tone === "orange" &&
          "bg-orange-500/15 text-orange-600 dark:text-orange-400",
        tone === "red" && "bg-red-500/15 text-red-600 dark:text-red-400",
      )}
    >
      {icon}
      {label}
    </span>
  );
}
