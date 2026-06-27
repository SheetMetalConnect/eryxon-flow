import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOperator } from "@/contexts/OperatorContext";
import { useRecordPlacement } from "@/hooks/locations/useRecordPlacement";
import { useStorageLocations } from "@/hooks/locations/useStorageLocations";
import { PlacementPickerModal } from "@/components/locations/PlacementPickerModal";
import { Button } from "@/components/ui/button";

interface OperationLocationTabProps {
  partId: string;
  operationId: string;
  /** Cell the part heads to next — scopes the slot suggestion and is shown to the operator. */
  nextCellId: string | null;
  nextCellName: string | null;
}

/**
 * "Where is this part?" — reads the part's one active placement and lets the
 * operator (re)record it from the same slot picker used on completion. Mounted
 * only when location tracking is enabled and the operator opens the tab, so the
 * storage-location queries never run on terminals that don't use the module.
 */
export function OperationLocationTab({
  partId,
  operationId,
  nextCellId,
  nextCellName,
}: OperationLocationTabProps) {
  const { t } = useTranslation();
  const profile = useProfile();
  const { activeOperator } = useOperator();
  const { recordPlacement, isRecording } = useRecordPlacement();
  const { locations } = useStorageLocations();
  const [pickerOpen, setPickerOpen] = useState(false);
  const tenantId = profile?.tenant_id ?? "";

  // Read only the active placement's location id, then resolve its code/label
  // from the slot list. Avoids a PostgREST FK embed (the kind that broke the
  // terminal in prod) and reuses the slots already fetched for the picker.
  const { data: placement, refetch } = useQuery({
    queryKey: ["part-placement", tenantId, partId],
    enabled: Boolean(tenantId && partId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("part_placements")
        .select("location_id")
        .eq("tenant_id", tenantId)
        .eq("part_id", partId)
        .is("removed_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const location = placement?.location_id
    ? locations.find((slot) => slot.id === placement.location_id) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {location
            ? t("locations.panel.currentlyAt", "Currently at")
            : t("locations.panel.notPlaced", "Not placed yet")}
        </div>
        {location ? (
          <div className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-mono">{location.code}</span>
            {location.label ? (
              <span className="text-sm font-normal text-muted-foreground">
                {location.label}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "locations.panel.notPlacedHint",
              "Record where you put this part so the next operator can find it.",
            )}
          </p>
        )}
      </div>

      {nextCellName ? (
        <div className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
          <span>{t("locations.placement.nextCell", "Heading to")}</span>
          <span className="font-semibold text-foreground">{nextCellName}</span>
        </div>
      ) : null}

      <Button
        variant="outline"
        onClick={() => setPickerOpen(true)}
        className="min-h-11 w-full rounded-lg"
      >
        <MapPin className="mr-1.5 h-4 w-4" />
        {location
          ? t("locations.panel.move", "Move to another slot")
          : t("locations.panel.record", "Record location")}
      </Button>

      <PlacementPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        cellId={nextCellId}
        nextCellName={nextCellName}
        isRecording={isRecording}
        onConfirm={(locationId) =>
          recordPlacement(
            {
              partId,
              locationId,
              operationId,
              operatorId: activeOperator?.id ?? null,
            },
            {
              onSuccess: () => {
                setPickerOpen(false);
                void refetch();
              },
            },
          )
        }
      />
    </div>
  );
}
