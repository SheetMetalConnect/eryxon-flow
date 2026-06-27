import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2, MapPin, PackageCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStorageLocations } from '@/hooks/locations/useStorageLocations'
import { suggestLocation, type LocationOccupancy } from '@/lib/locations/placement'

interface PlacementPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cell to scope the slot suggestion to — the cell the part is heading to. */
  cellId?: string | null
  /** Name of the next cell, shown so the operator drops it in the right lane. */
  nextCellName?: string | null
  isRecording?: boolean
  onConfirm: (locationId: string) => void
}

/**
 * "Waar heb je het neergelegd?" — grid picker an operator uses after completing
 * an operation. Slots render as a grid (free vs full from live occupancy); the
 * suggested open slot is pre-selected.
 */
export function PlacementPickerModal({
  open,
  onOpenChange,
  cellId,
  nextCellName,
  isRecording = false,
  onConfirm,
}: PlacementPickerModalProps) {
  const { t } = useTranslation()
  const { occupancy, isLoading } = useStorageLocations()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const suggested = useMemo(
    () => suggestLocation(occupancy, { cellId }),
    [occupancy, cellId],
  )

  // Pre-select the suggested slot whenever the modal opens or suggestion changes.
  useEffect(() => {
    if (!open) return
    setSelectedId((current) => current ?? suggested?.location.id ?? null)
  }, [open, suggested])

  // Reset selection when the modal closes so the next open re-suggests.
  useEffect(() => {
    if (!open) setSelectedId(null)
  }, [open])

  const sorted = useMemo(() => {
    return [...occupancy].sort(
      (a, b) =>
        (a.location.sort_order ?? 0) - (b.location.sort_order ?? 0) ||
        a.location.code.localeCompare(b.location.code),
    )
  }, [occupancy])

  const handleConfirm = () => {
    if (selectedId) onConfirm(selectedId)
  }

  const renderSlot = (slot: LocationOccupancy) => {
    const isSelected = slot.location.id === selectedId
    const isSuggested = suggested?.location.id === slot.location.id
    const disabled = slot.isFull && !isSelected

    return (
      <button
        key={slot.location.id}
        type="button"
        disabled={disabled}
        onClick={() => setSelectedId(slot.location.id)}
        className={cn(
          'relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all',
          slot.isFull
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
          isSelected && 'border-primary bg-primary/10 ring-2 ring-primary',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {isSuggested ? (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
            {t('locations.placement.suggested')}
          </span>
        ) : null}
        <span className="font-mono text-sm font-semibold">{slot.location.code}</span>
        {slot.location.label ? (
          <span className="line-clamp-1 text-[11px] text-muted-foreground">
            {slot.location.label}
          </span>
        ) : null}
        <span
          className={cn(
            'text-[11px] font-medium',
            slot.isFull ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {slot.isFull
            ? t('locations.placement.full')
            : t('locations.placement.occupancy', {
                occupied: slot.occupied,
                capacity: slot.location.capacity,
              })}
        </span>
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('locations.placement.title')}
          </DialogTitle>
          <DialogDescription>{t('locations.placement.description')}</DialogDescription>
          {nextCellName ? (
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t('locations.placement.nextCell', 'Heading to')}
              </span>
              <span className="font-semibold text-foreground">{nextCellName}</span>
            </div>
          ) : null}
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t('locations.placement.noSlots')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {sorted.map(renderSlot)}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isRecording}
          >
            {t('locations.placement.skip')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || isRecording}
            className="gap-2"
          >
            {isRecording ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4" />
            )}
            {t('locations.placement.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
