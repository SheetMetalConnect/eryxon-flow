import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useShipment, useRemoveJobFromShipment, useUpdateShipmentStatus } from '@/hooks/useShipments';
import { SHIPMENT_STATUS_CONFIG, VEHICLE_TYPE_CONFIG, ShipmentStatus } from '@/types/shipping';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Truck,
  Calendar,
  MapPin,
  Package,
  Weight,
  Box,
  User,
  Phone,
  Route,
  Clock,
  X,
  CheckCircle2,
  Play,
  PackageCheck,
  Send,
  ArrowRight,
  Building,
  Hash,
} from 'lucide-react';

interface ShipmentDetailModalProps {
  shipmentId: string;
  onClose: () => void;
}

export default function ShipmentDetailModal({ shipmentId, onClose }: ShipmentDetailModalProps) {
  const { t } = useTranslation();
  const { data: shipment, isLoading } = useShipment(shipmentId);
  const removeJob = useRemoveJobFromShipment();
  const updateStatus = useUpdateShipmentStatus();

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="glass-card max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!shipment) {
    return null;
  }

  const statusConfig = SHIPMENT_STATUS_CONFIG[shipment.status];
  const vehicleConfig = shipment.vehicle_type
    ? VEHICLE_TYPE_CONFIG[shipment.vehicle_type]
    : null;

  const weightUsage = shipment.max_weight_kg
    ? ((shipment.current_weight_kg || 0) / shipment.max_weight_kg) * 100
    : null;

  const volumeUsage = shipment.max_volume_m3
    ? ((shipment.current_volume_m3 || 0) / shipment.max_volume_m3) * 100
    : null;

  const handleRemoveJob = (jobId: string) => {
    if (confirm(t('shipping.confirmRemoveJob', 'Remove this job from the shipment?'))) {
      removeJob.mutate({ shipment_id: shipmentId, job_id: jobId });
    }
  };

  const handleStatusChange = (status: ShipmentStatus) => {
    updateStatus.mutate({ id: shipmentId, status });
  };

  const getNextStatusAction = () => {
    switch (shipment.status) {
      case 'draft':
        return { status: 'planned' as ShipmentStatus, label: t('shipping.markPlanned', 'Mark as Planned'), icon: Calendar };
      case 'planned':
        return { status: 'loading' as ShipmentStatus, label: t('shipping.startLoading', 'Start Loading'), icon: PackageCheck };
      case 'loading':
        return { status: 'in_transit' as ShipmentStatus, label: t('shipping.startTransit', 'Start Transit'), icon: Play };
      case 'in_transit':
        return { status: 'delivered' as ShipmentStatus, label: t('shipping.markDelivered', 'Mark Delivered'), icon: CheckCircle2 };
      default:
        return null;
    }
  };

  const nextAction = getNextStatusAction();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                <Truck className="h-5 w-5 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <DialogTitle className="text-xl">{shipment.shipment_number}</DialogTitle>
                {shipment.name && (
                  <p className="text-sm text-muted-foreground">{shipment.name}</p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn('font-medium text-sm', statusConfig.bgColor, statusConfig.color, statusConfig.borderColor)}
            >
              {t(`shipping.status.${shipment.status}`, statusConfig.label)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-4 pr-4">
            {/* Quick Actions */}
            {nextAction && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleStatusChange(nextAction.status)}
                  className="cta-button"
                >
                  <nextAction.icon className="mr-2 h-4 w-4" />
                  {nextAction.label}
                </Button>
                {shipment.status !== 'draft' && shipment.status !== 'cancelled' && shipment.status !== 'delivered' && (
                  <Button
                    variant="outline"
                    className="text-[hsl(var(--color-error))] border-[hsl(var(--color-error))]/30"
                    onClick={() => handleStatusChange('cancelled')}
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t('shipping.cancel', 'Cancel')}
                  </Button>
                )}
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Schedule & Vehicle */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('shipping.scheduleAndVehicle', 'Schedule & Vehicle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {shipment.scheduled_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('shipping.scheduledDate', 'Scheduled')}</span>
                      <span className="font-medium">
                        {format(new Date(shipment.scheduled_date), 'PPP')}
                        {shipment.scheduled_time && ` ${shipment.scheduled_time.slice(0, 5)}`}
                      </span>
                    </div>
                  )}
                  {vehicleConfig && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('shipping.vehicle', 'Vehicle')}</span>
                      <span className="font-medium flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        {t(`shipping.vehicleType.${shipment.vehicle_type}`, vehicleConfig.label)}
                      </span>
                    </div>
                  )}
                  {shipment.vehicle_identifier && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('shipping.vehicleId', 'Vehicle ID')}</span>
                      <span className="font-medium">{shipment.vehicle_identifier}</span>
                    </div>
                  )}
                  {shipment.driver_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('shipping.driver', 'Driver')}</span>
                      <span className="font-medium flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {shipment.driver_name}
                      </span>
                    </div>
                  )}
                  {shipment.driver_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('shipping.phone', 'Phone')}</span>
                      <span className="font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {shipment.driver_phone}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Capacity */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    {t('shipping.capacity', 'Capacity')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5" />
                        {t('shipping.weight', 'Weight')}
                      </span>
                      <span className="text-sm font-medium">
                        {(shipment.current_weight_kg || 0).toFixed(1)} kg
                        {shipment.max_weight_kg && ` / ${shipment.max_weight_kg} kg`}
                      </span>
                    </div>
                    {weightUsage !== null && (
                      <Progress
                        value={weightUsage}
                        className={cn(
                          'h-2',
                          weightUsage > 90 && '[&>div]:bg-[hsl(var(--color-error))]',
                          weightUsage > 70 && weightUsage <= 90 && '[&>div]:bg-[hsl(var(--color-warning))]'
                        )}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Box className="h-3.5 w-3.5" />
                        {t('shipping.volume', 'Volume')}
                      </span>
                      <span className="text-sm font-medium">
                        {(shipment.current_volume_m3 || 0).toFixed(2)} m³
                        {shipment.max_volume_m3 && ` / ${shipment.max_volume_m3} m³`}
                      </span>
                    </div>
                    {volumeUsage !== null && (
                      <Progress
                        value={volumeUsage}
                        className={cn(
                          'h-2',
                          volumeUsage > 90 && '[&>div]:bg-[hsl(var(--color-error))]',
                          volumeUsage > 70 && volumeUsage <= 90 && '[&>div]:bg-[hsl(var(--color-warning))]'
                        )}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">{t('shipping.totalItems', 'Total Items')}</span>
                    <span className="font-medium">{shipment.items_count} {t('shipping.jobs', 'jobs')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Route */}
            {(shipment.origin_city || shipment.destination_city) && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    {t('shipping.route', 'Route')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {/* Origin */}
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">{t('shipping.origin', 'Origin')}</div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-[hsl(var(--brand-primary))] mt-1" />
                        <div>
                          <div className="font-medium">{shipment.origin_name || shipment.origin_city || '-'}</div>
                          {shipment.origin_address && (
                            <div className="text-sm text-muted-foreground">{shipment.origin_address}</div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {shipment.origin_postal_code} {shipment.origin_city}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      {shipment.distance_km && (
                        <span className="text-xs text-muted-foreground">{shipment.distance_km} km</span>
                      )}
                    </div>

                    {/* Destination */}
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">{t('shipping.destination', 'Destination')}</div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-[hsl(var(--color-success))] mt-1" />
                        <div>
                          <div className="font-medium">{shipment.destination_name || shipment.destination_city || '-'}</div>
                          {shipment.destination_address && (
                            <div className="text-sm text-muted-foreground">{shipment.destination_address}</div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {shipment.destination_postal_code} {shipment.destination_city}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Jobs List */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('shipping.assignedJobs', 'Assigned Jobs')} ({shipment.shipment_jobs?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shipment.shipment_jobs && shipment.shipment_jobs.length > 0 ? (
                  <div className="space-y-2">
                    {shipment.shipment_jobs.map((sj: any, index: number) => (
                      <div
                        key={sj.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              {sj.job?.job_number || sj.job_id}
                            </div>
                            {sj.job?.customer && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {sj.job.customer}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {sj.job?.delivery_city && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {sj.job.delivery_city}
                            </div>
                          )}
                          {sj.weight_kg && (
                            <div className="text-sm text-muted-foreground">
                              {sj.weight_kg} kg
                            </div>
                          )}
                          {shipment.status === 'draft' || shipment.status === 'planned' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-[hsl(var(--color-error))]"
                              onClick={() => handleRemoveJob(sj.job_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            sj.delivered_at && (
                              <Badge variant="outline" className="bg-[hsl(var(--color-success))]/10 text-[hsl(var(--color-success))]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t('shipping.delivered', 'Delivered')}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('shipping.noJobsAssigned', 'No jobs assigned to this shipment yet.')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {shipment.notes && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('Notes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{shipment.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground flex items-center gap-4 pt-2">
              <span>Created: {format(new Date(shipment.created_at), 'PPp')}</span>
              {shipment.actual_departure && (
                <span>Departed: {format(new Date(shipment.actual_departure), 'PPp')}</span>
              )}
              {shipment.actual_arrival && (
                <span>Arrived: {format(new Date(shipment.actual_arrival), 'PPp')}</span>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
