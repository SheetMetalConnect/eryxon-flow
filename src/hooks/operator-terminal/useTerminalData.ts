import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { supabase } from "@/integrations/supabase/client";
import { fetchOperationLookupDetails, type OperationWithDetails } from "@/lib/db";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import {
  DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS,
  getOperatorTerminalWorkModeSettings,
  type OperatorTerminalSchedule,
  type OperatorTerminalWorkModeSettings,
} from "@/features/operator-terminal/workModes";
import { getSequentialReleaseSetting } from "@/features/operator-terminal/release";
import type { TerminalCell } from "@/features/operator-terminal/model";

const EMPTY_SCHEDULE: OperatorTerminalSchedule = {
  openingTime: null,
  closingTime: null,
  timezone: null,
};

export function useTerminalData(tenantId: string | undefined, t: TFunction) {
  const [operations, setOperations] = useState<OperationWithDetails[]>([]);
  const [lookupOperations, setLookupOperations] = useState<OperationWithDetails[]>([]);
  const [cells, setCells] = useState<TerminalCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [producedByOperation, setProducedByOperation] = useState(new Map<string, number>());
  const [locationByPart, setLocationByPart] = useState(new Map<string, string>());
  const [workModeSettings, setWorkModeSettings] = useState<OperatorTerminalWorkModeSettings>(
    DEFAULT_OPERATOR_TERMINAL_WORK_MODE_SETTINGS,
  );
  const [workModeSettingsLoaded, setWorkModeSettingsLoaded] = useState(false);
  const [sequentialRelease, setSequentialRelease] = useState(false);
  const [workingHoursSchedule, setWorkingHoursSchedule] = useState(EMPTY_SCHEDULE);
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    const currentRequest = ++requestId.current;
    setLoading(true);

    try {
      const [ops, cellsResult, tenant, quantities, placements, locations] = await Promise.all([
        fetchOperationLookupDetails(tenantId),
        supabase.from("cells").select("id, name, color").eq("tenant_id", tenantId).eq("active", true).order("sequence"),
        supabase.from("tenants").select("feature_flags, factory_opening_time, factory_closing_time, timezone, location_tracking_enabled").eq("id", tenantId).single(),
        supabase.from("operation_quantities").select("operation_id, quantity_good").eq("tenant_id", tenantId),
        supabase.from("part_placements").select("part_id, location_id").eq("tenant_id", tenantId).is("removed_at", null),
        supabase.from("storage_locations").select("id, code").eq("tenant_id", tenantId),
      ]);
      const error = [cellsResult.error, tenant.error, quantities.error, placements.error, locations.error].find(Boolean);
      if (error) throw error;
      if (currentRequest !== requestId.current) return;

      const produced = new Map<string, number>();
      for (const row of quantities.data ?? []) {
        produced.set(row.operation_id, (produced.get(row.operation_id) ?? 0) + (row.quantity_good ?? 0));
      }
      const locationCodes = new Map((locations.data ?? []).map((location) => [location.id, location.code]));
      const activeLocations = new Map(
        (placements.data ?? []).flatMap((placement) => {
          const code = locationCodes.get(placement.location_id);
          return code ? [[placement.part_id, code] as const] : [];
        }),
      );

      setLookupOperations(ops);
      setOperations(ops.filter((operation) => operation.status !== "completed"));
      setCells(cellsResult.data ?? []);
      setProducedByOperation(produced);
      setLocationByPart(tenant.data?.location_tracking_enabled ? activeLocations : new Map());
      setWorkModeSettings(getOperatorTerminalWorkModeSettings(tenant.data?.feature_flags));
      setSequentialRelease(getSequentialReleaseSetting(tenant.data?.feature_flags));
      setWorkingHoursSchedule({
        openingTime: tenant.data?.factory_opening_time ?? null,
        closingTime: tenant.data?.factory_closing_time ?? null,
        timezone: tenant.data?.timezone ?? null,
      });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      logger.error("OperatorView", "Error loading data", error);
      toast.error(t("notifications.failedToLoadData"));
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setWorkModeSettingsLoaded(true);
      }
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadData();
    if (!tenantId) return;
    const reload = (): void => { void loadData(); };
    const channel = supabase.channel("operator-terminal-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "operations", filter: `tenant_id=eq.${tenantId}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries", filter: `tenant_id=eq.${tenantId}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "part_placements", filter: `tenant_id=eq.${tenantId}` }, reload)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadData, tenantId]);

  return {
    cells, loading, locationByPart, lookupOperations, operations, producedByOperation,
    sequentialRelease, workingHoursSchedule, workModeSettings, workModeSettingsLoaded, loadData,
  };
}
