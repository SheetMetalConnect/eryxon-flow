import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAvailableJobsForShipping, useAddJobsToShipment, useShipment } from '@/hooks/useShipments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Package,
  MapPin,
  Weight,
  Box,
  Search,
  Building,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AssignJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string | null;
}

export default function AssignJobsDialog({ open, onOpenChange, shipmentId }: AssignJobsDialogProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [expandedPostalCodes, setExpandedPostalCodes] = useState<Set<string>>(new Set());

  const { data: availableJobs, isLoading: jobsLoading } = useAvailableJobsForShipping();
  const { data: shipment } = useShipment(shipmentId);
  const addJobs = useAddJobsToShipment();

  // Group jobs by postal code
  const jobsByPostalCode = useMemo(() => {
    if (!availableJobs) return {};

    const groups: Record<string, typeof availableJobs> = {};

    availableJobs.forEach((job: any) => {
      const key = job.delivery_postal_code || 'no-postal-code';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(job);
    });

    return groups;
  }, [availableJobs]);

  // Filter jobs by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return jobsByPostalCode;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, any[]> = {};

    Object.entries(jobsByPostalCode).forEach(([postalCode, jobs]) => {
      const matchingJobs = jobs.filter((job: any) =>
        job.job_number.toLowerCase().includes(query) ||
        job.customer?.toLowerCase().includes(query) ||
        job.delivery_city?.toLowerCase().includes(query) ||
        postalCode.toLowerCase().includes(query)
      );
      if (matchingJobs.length > 0) {
        filtered[postalCode] = matchingJobs;
      }
    });

    return filtered;
  }, [jobsByPostalCode, searchQuery]);

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    if (!availableJobs) return { weight: 0, volume: 0, count: 0 };

    return selectedJobIds.reduce(
      (acc, jobId) => {
        const job = availableJobs.find((j: any) => j.id === jobId);
        if (job) {
          acc.weight += job.total_weight_kg || 0;
          acc.volume += job.total_volume_m3 || 0;
          acc.count += job.package_count || 1;
        }
        return acc;
      },
      { weight: 0, volume: 0, count: 0 }
    );
  }, [availableJobs, selectedJobIds]);

  // Check capacity
  const weightUsage = shipment?.max_weight_kg
    ? (((shipment.current_weight_kg || 0) + selectedTotals.weight) / shipment.max_weight_kg) * 100
    : null;

  const volumeUsage = shipment?.max_volume_m3
    ? (((shipment.current_volume_m3 || 0) + selectedTotals.volume) / shipment.max_volume_m3) * 100
    : null;

  const isOverCapacity = (weightUsage && weightUsage > 100) || (volumeUsage && volumeUsage > 100);

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const togglePostalCodeExpanded = (postalCode: string) => {
    setExpandedPostalCodes((prev) => {
      const next = new Set(prev);
      if (next.has(postalCode)) {
        next.delete(postalCode);
      } else {
        next.add(postalCode);
      }
      return next;
    });
  };

  const selectAllInPostalCode = (postalCode: string) => {
    const jobs = jobsByPostalCode[postalCode] || [];
    const jobIds = jobs.map((j: any) => j.id);
    const allSelected = jobIds.every((id: string) => selectedJobIds.includes(id));

    if (allSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !jobIds.includes(id)));
    } else {
      setSelectedJobIds((prev) => [...new Set([...prev, ...jobIds])]);
    }
  };

  const handleSubmit = async () => {
    if (!shipmentId || selectedJobIds.length === 0) return;

    await addJobs.mutateAsync({
      shipment_id: shipmentId,
      job_ids: selectedJobIds,
    });

    setSelectedJobIds([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedJobIds([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('shipping.assignJobs', 'Assign Jobs to Shipment')}
          </DialogTitle>
          <DialogDescription>
            {shipment && (
              <span>
                {t('shipping.assigningTo', 'Adding jobs to shipment')} <strong>{shipment.shipment_number}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Capacity Summary */}
        {shipment && (selectedTotals.weight > 0 || selectedTotals.volume > 0) && (
          <div className={cn(
            "p-3 rounded-lg border",
            isOverCapacity
              ? "bg-[hsl(var(--color-error))]/10 border-[hsl(var(--color-error))]/30"
              : "bg-muted/50 border-border/50"
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                {isOverCapacity ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-[hsl(var(--color-error))]" />
                    {t('shipping.overCapacity', 'Over Capacity!')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--color-success))]" />
                    {t('shipping.selectionSummary', 'Selection Summary')}
                  </>
                )}
              </span>
              <Badge variant="outline">{selectedJobIds.length} {t('shipping.jobsSelected', 'jobs selected')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {shipment.max_weight_kg && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{t('shipping.weight', 'Weight')}</span>
                    <span className={cn(weightUsage && weightUsage > 100 && "text-[hsl(var(--color-error))]")}>
                      {((shipment.current_weight_kg || 0) + selectedTotals.weight).toFixed(1)} / {shipment.max_weight_kg} kg
                    </span>
                  </div>
                  <Progress
                    value={Math.min(weightUsage || 0, 100)}
                    className={cn(
                      "h-2",
                      weightUsage && weightUsage > 100 && "[&>div]:bg-[hsl(var(--color-error))]",
                      weightUsage && weightUsage > 80 && weightUsage <= 100 && "[&>div]:bg-[hsl(var(--color-warning))]"
                    )}
                  />
                </div>
              )}
              {shipment.max_volume_m3 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{t('shipping.volume', 'Volume')}</span>
                    <span className={cn(volumeUsage && volumeUsage > 100 && "text-[hsl(var(--color-error))]")}>
                      {((shipment.current_volume_m3 || 0) + selectedTotals.volume).toFixed(2)} / {shipment.max_volume_m3} m³
                    </span>
                  </div>
                  <Progress
                    value={Math.min(volumeUsage || 0, 100)}
                    className={cn(
                      "h-2",
                      volumeUsage && volumeUsage > 100 && "[&>div]:bg-[hsl(var(--color-error))]",
                      volumeUsage && volumeUsage > 80 && volumeUsage <= 100 && "[&>div]:bg-[hsl(var(--color-warning))]"
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('shipping.searchJobs', 'Search by job number, customer, or location...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Jobs List */}
        <ScrollArea className="h-[400px] pr-4">
          {jobsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(filteredGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p>{t('shipping.noJobsAvailable', 'No completed jobs available for shipping.')}</p>
              <p className="text-xs">{t('shipping.completeJobsFirst', 'Complete some jobs to assign them to shipments.')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(filteredGroups).map(([postalCode, jobs]) => {
                const isExpanded = expandedPostalCodes.has(postalCode);
                const jobIds = jobs.map((j: any) => j.id);
                const selectedCount = jobIds.filter((id: string) => selectedJobIds.includes(id)).length;
                const totalWeight = jobs.reduce((sum: number, j: any) => sum + (j.total_weight_kg || 0), 0);
                const firstJob = jobs[0] as any;

                return (
                  <Collapsible
                    key={postalCode}
                    open={isExpanded}
                    onOpenChange={() => togglePostalCodeExpanded(postalCode)}
                  >
                    <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <MapPin className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
                            <div className="text-left">
                              <div className="font-medium">
                                {postalCode === 'no-postal-code'
                                  ? t('shipping.noPostalCode', 'No Postal Code')
                                  : postalCode}
                              </div>
                              {firstJob?.delivery_city && (
                                <div className="text-xs text-muted-foreground">{firstJob.delivery_city}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">
                              {totalWeight > 0 && <span>{totalWeight.toFixed(1)} kg</span>}
                            </div>
                            <Badge variant="outline">
                              {selectedCount > 0 ? `${selectedCount}/` : ''}{jobs.length} {t('shipping.jobs', 'jobs')}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllInPostalCode(postalCode);
                              }}
                            >
                              {selectedCount === jobs.length ? t('shipping.deselectAll', 'Deselect All') : t('shipping.selectAll', 'Select All')}
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-border/50">
                          {jobs.map((job: any) => {
                            const isSelected = selectedJobIds.includes(job.id);
                            return (
                              <div
                                key={job.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border/30 last:border-b-0",
                                  isSelected ? "bg-[hsl(var(--brand-primary))]/10" : "hover:bg-muted/50"
                                )}
                                onClick={() => toggleJobSelection(job.id)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleJobSelection(job.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">{job.job_number}</span>
                                    {job.customer && (
                                      <>
                                        <span className="text-muted-foreground">|</span>
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Building className="h-3 w-3" />
                                          {job.customer}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {job.total_weight_kg && (
                                    <span className="flex items-center gap-1">
                                      <Weight className="h-3.5 w-3.5" />
                                      {job.total_weight_kg} kg
                                    </span>
                                  )}
                                  {job.total_volume_m3 && (
                                    <span className="flex items-center gap-1">
                                      <Box className="h-3.5 w-3.5" />
                                      {job.total_volume_m3} m³
                                    </span>
                                  )}
                                  {job.parts_count && (
                                    <span className="flex items-center gap-1">
                                      <Package className="h-3.5 w-3.5" />
                                      {job.parts_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('Cancel')}
          </Button>
          <Button
            className="cta-button"
            onClick={handleSubmit}
            disabled={selectedJobIds.length === 0 || addJobs.isPending}
          >
            {addJobs.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('shipping.addJobs', 'Add')} {selectedJobIds.length > 0 && `(${selectedJobIds.length})`} {t('shipping.jobs', 'Jobs')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
