import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from "@/components/ui/data-table/DataTable";
import { DataTableColumnHeader } from "@/components/ui/data-table/DataTableColumnHeader";
import type { DataTableFilterableColumn } from "@/components/ui/data-table/DataTable";
import { cn } from '@/lib/utils';
import {
  useShipments,
  useShipmentStats,
  useJobsByPostalCode,
  useDeleteShipment,
  useUpdateShipmentStatus,
} from '@/hooks/useShipments';
import type {
  ShipmentWithJobs,
  ShipmentStatus,
  PostalCodeGroup,
} from '@/types/shipping';
import { SHIPMENT_STATUS_CONFIG, VEHICLE_TYPE_CONFIG } from '@/types/shipping';
import { format } from 'date-fns';
import {
  Plus,
  Truck,
  Package,
  MapPin,
  Calendar,
  Weight,
  Box,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Route,
  Clock,
  Info,
  HelpCircle,
  ChevronRight,
  Users,
  Map,
  LayoutGrid,
  List,
  Send,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import ShipmentDetailModal from '@/components/admin/ShipmentDetailModal';
import CreateShipmentDialog from '@/components/admin/CreateShipmentDialog';
import AssignJobsDialog from '@/components/admin/AssignJobsDialog';
import PostalCodeMapView from '@/components/admin/PostalCodeMapView';

export default function Shipments() {
  const { t } = useTranslation();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignJobsDialogOpen, setAssignJobsDialogOpen] = useState(false);
  const [assignToShipmentId, setAssignToShipmentId] = useState<string | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shipments' | 'ready-to-ship'>('shipments');

  const { data: shipments, isLoading } = useShipments();
  const { data: stats } = useShipmentStats();
  const { data: postalCodeGroups } = useJobsByPostalCode();
  const deleteShipment = useDeleteShipment();
  const updateStatus = useUpdateShipmentStatus();

  const handleDelete = (id: string) => {
    if (confirm(t('shipping.confirmDelete', 'Are you sure you want to delete this shipment?'))) {
      deleteShipment.mutate(id);
    }
  };

  const handleStatusChange = (id: string, status: ShipmentStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleOpenAssignJobs = (shipmentId: string) => {
    setAssignToShipmentId(shipmentId);
    setAssignJobsDialogOpen(true);
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    const config = SHIPMENT_STATUS_CONFIG[status];
    return (
      <Badge
        variant="outline"
        className={cn('font-medium', config.bgColor, config.color, config.borderColor)}
      >
        {t(`shipping.status.${status}`, config.label)}
      </Badge>
    );
  };

  const getVehicleIcon = (type: string | null) => {
    if (!type) return <Truck className="h-4 w-4" />;
    const config = VEHICLE_TYPE_CONFIG[type as keyof typeof VEHICLE_TYPE_CONFIG];
    return <Truck className="h-4 w-4" />;
  };

  const getCapacityUsage = (shipment: ShipmentWithJobs) => {
    if (!shipment.max_weight_kg) return null;
    const percentage = ((shipment.current_weight_kg || 0) / shipment.max_weight_kg) * 100;
    return Math.min(percentage, 100);
  };

  const columns: ColumnDef<ShipmentWithJobs>[] = useMemo(
    () => [
      {
        accessorKey: 'shipment_number',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('shipping.shipmentNumber', 'Shipment #')} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{row.getValue('shipment_number')}</span>
            {row.original.name && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {row.original.name}
              </span>
            )}
          </div>
        ),
        size: 150,
      },
      {
        accessorKey: 'scheduled_date',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('shipping.scheduledDate', 'Date')} />
        ),
        cell: ({ row }) => {
          const date = row.original.scheduled_date;
          const time = row.original.scheduled_time;
          if (!date) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{format(new Date(date), 'MMM dd')}</span>
              {time && <span className="text-xs text-muted-foreground">{time.slice(0, 5)}</span>}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('Status')} />
        ),
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
        size: 120,
      },
      {
        accessorKey: 'vehicle_type',
        header: t('shipping.vehicle', 'Vehicle'),
        cell: ({ row }) => {
          const type = row.original.vehicle_type;
          if (!type) return <span className="text-muted-foreground">-</span>;
          const config = VEHICLE_TYPE_CONFIG[type];
          return (
            <div className="flex items-center gap-1.5">
              {getVehicleIcon(type)}
              <span className="text-sm">{t(`shipping.vehicleType.${type}`, config?.label || type)}</span>
            </div>
          );
        },
        size: 100,
      },
      {
        id: 'destination',
        header: t('shipping.destination', 'Destination'),
        cell: ({ row }) => {
          const { destination_city, destination_postal_code } = row.original;
          if (!destination_city && !destination_postal_code) {
            return <span className="text-muted-foreground">-</span>;
          }
          return (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">{destination_city || '-'}</span>
                {destination_postal_code && (
                  <span className="text-xs text-muted-foreground">{destination_postal_code}</span>
                )}
              </div>
            </div>
          );
        },
        size: 140,
      },
      {
        id: 'items',
        header: t('shipping.items', 'Items'),
        cell: ({ row }) => {
          const shipment = row.original;
          const jobCount = shipment.shipment_jobs?.length || 0;
          return (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title={t('shipping.jobs', 'Jobs')}>
                <Package className="h-3.5 w-3.5" />
                {jobCount}
              </span>
              {shipment.current_weight_kg > 0 && (
                <span className="flex items-center gap-1" title={t('shipping.weight', 'Weight')}>
                  <Weight className="h-3.5 w-3.5" />
                  {shipment.current_weight_kg.toFixed(1)} kg
                </span>
              )}
            </div>
          );
        },
        size: 120,
      },
      {
        id: 'capacity',
        header: t('shipping.capacity', 'Capacity'),
        cell: ({ row }) => {
          const usage = getCapacityUsage(row.original);
          if (usage === null) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="w-20">
              <Progress
                value={usage}
                className={cn(
                  'h-2',
                  usage > 90 && '[&>div]:bg-[hsl(var(--color-error))]',
                  usage > 70 && usage <= 90 && '[&>div]:bg-[hsl(var(--color-warning))]'
                )}
              />
              <span className="text-xs text-muted-foreground">{usage.toFixed(0)}%</span>
            </div>
          );
        },
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const shipment = row.original;
          const canEdit = shipment.status === 'draft' || shipment.status === 'planned';
          const canStart = shipment.status === 'planned' || shipment.status === 'loading';
          const canDeliver = shipment.status === 'in_transit';
          const canCancel = shipment.status !== 'delivered' && shipment.status !== 'cancelled';

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShipmentId(shipment.id);
                  }}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {t('common.viewDetails', 'View Details')}
                </DropdownMenuItem>

                {canEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAssignJobs(shipment.id);
                    }}
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    {t('shipping.assignJobs', 'Assign Jobs')}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {shipment.status === 'draft' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(shipment.id, 'planned');
                    }}
                    className="gap-2 text-[hsl(var(--color-info))]"
                  >
                    <Calendar className="h-4 w-4" />
                    {t('shipping.markPlanned', 'Mark as Planned')}
                  </DropdownMenuItem>
                )}

                {shipment.status === 'planned' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(shipment.id, 'loading');
                    }}
                    className="gap-2 text-[hsl(var(--color-warning))]"
                  >
                    <PackageCheck className="h-4 w-4" />
                    {t('shipping.startLoading', 'Start Loading')}
                  </DropdownMenuItem>
                )}

                {canStart && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(shipment.id, 'in_transit');
                    }}
                    className="gap-2 text-[hsl(var(--brand-primary))]"
                  >
                    <Play className="h-4 w-4" />
                    {t('shipping.startTransit', 'Start Transit')}
                  </DropdownMenuItem>
                )}

                {canDeliver && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(shipment.id, 'delivered');
                    }}
                    className="gap-2 text-[hsl(var(--color-success))]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('shipping.markDelivered', 'Mark Delivered')}
                  </DropdownMenuItem>
                )}

                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(shipment.id, 'cancelled');
                      }}
                      className="gap-2 text-[hsl(var(--color-error))]"
                    >
                      <XCircle className="h-4 w-4" />
                      {t('shipping.cancel', 'Cancel')}
                    </DropdownMenuItem>
                  </>
                )}

                {shipment.status === 'draft' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(shipment.id);
                      }}
                      className="gap-2 text-[hsl(var(--color-error))]"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete', 'Delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 50,
      },
    ],
    [t]
  );

  const filterableColumns: DataTableFilterableColumn[] = useMemo(
    () => [
      {
        id: 'status',
        title: t('Status'),
        options: Object.entries(SHIPMENT_STATUS_CONFIG).map(([value, config]) => ({
          label: t(`shipping.status.${value}`, config.label),
          value,
        })),
      },
    ],
    [t]
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              {t('shipping.title', 'Shipping Management')}
            </h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setHelpDialogOpen(true)}
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('shipping.howToUse', 'How to use shipping management')}
              </TooltipContent>
            </Tooltip>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="cta-button">
            <Plus className="mr-2 h-4 w-4" /> {t('shipping.createShipment', 'Create Shipment')}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          {t(
            'shipping.subtitle',
            'Group completed jobs into shipments, assign vehicles, and track deliveries'
          )}
        </p>
      </div>

      <hr className="title-divider" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                <Truck className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.total || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.total', 'Total')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <Edit className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.draft || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.status.draft', 'Draft')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-info))]/10">
                <Calendar className="h-4 w-4 text-[hsl(var(--color-info))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.planned || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.status.planned', 'Planned')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                <PackageCheck className="h-4 w-4 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.loading || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.status.loading', 'Loading')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--brand-primary))]/10">
                <Route className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.in_transit || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.status.in_transit', 'In Transit')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-success))]/10">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--color-success))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.delivered || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.status.delivered', 'Delivered')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-warning))]/10">
                <Clock className="h-4 w-4 text-[hsl(var(--color-warning))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats?.scheduledToday || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.today', 'Today')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card transition-smooth hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--color-info))]/10">
                <Package className="h-4 w-4 text-[hsl(var(--color-info))]" />
              </div>
              <div>
                <div className="text-xl font-bold">{postalCodeGroups?.reduce((sum, g) => sum + g.jobs.length, 0) || 0}</div>
                <div className="text-xs text-muted-foreground">{t('shipping.readyToShip', 'Ready to Ship')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="glass-card">
          <TabsTrigger value="shipments" className="gap-2">
            <Truck className="h-4 w-4" />
            {t('shipping.shipments', 'Shipments')}
          </TabsTrigger>
          <TabsTrigger value="ready-to-ship" className="gap-2">
            <Package className="h-4 w-4" />
            {t('shipping.readyToShip', 'Ready to Ship')}
            {(postalCodeGroups?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {postalCodeGroups?.reduce((sum, g) => sum + g.jobs.length, 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="mt-4">
          <div className="glass-card p-4">
            <DataTable
              columns={columns}
              data={shipments || []}
              filterableColumns={filterableColumns}
              searchPlaceholder={t('shipping.searchShipments', 'Search shipments...')}
              loading={isLoading}
              pageSize={20}
              emptyMessage={t('shipping.noShipmentsFound', 'No shipments found. Create your first shipment to get started.')}
              searchDebounce={200}
              onRowClick={(row) => setSelectedShipmentId(row.id)}
              compact={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="ready-to-ship" className="mt-4">
          <PostalCodeMapView
            groups={postalCodeGroups || []}
            onCreateShipment={(jobIds) => {
              setCreateDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals/Dialogs */}
      {selectedShipmentId && (
        <ShipmentDetailModal
          shipmentId={selectedShipmentId}
          onClose={() => setSelectedShipmentId(null)}
        />
      )}

      <CreateShipmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <AssignJobsDialog
        open={assignJobsDialogOpen}
        onOpenChange={setAssignJobsDialogOpen}
        shipmentId={assignToShipmentId}
      />

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="glass-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t('shipping.howToUseTitle', 'How to Use Shipping Management')}
            </DialogTitle>
            <DialogDescription>
              {t('shipping.howToUseDescription', 'A complete guide to managing shipments and deliveries')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--brand-primary))]">1</span>
                </div>
                <div>
                  <h4 className="font-semibold">{t('shipping.step1Title', 'Complete Jobs')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('shipping.step1Desc', 'First, complete your manufacturing jobs. Only completed jobs can be assigned to shipments.')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--brand-primary))]">2</span>
                </div>
                <div>
                  <h4 className="font-semibold">{t('shipping.step2Title', 'View Ready to Ship')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('shipping.step2Desc', 'Go to the "Ready to Ship" tab to see completed jobs grouped by postal code. This helps you batch deliveries efficiently.')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--brand-primary))]">3</span>
                </div>
                <div>
                  <h4 className="font-semibold">{t('shipping.step3Title', 'Create Shipment')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('shipping.step3Desc', 'Click "Create Shipment" to set up a new delivery. Specify the vehicle type, schedule, and destination details.')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--brand-primary))]">4</span>
                </div>
                <div>
                  <h4 className="font-semibold">{t('shipping.step4Title', 'Assign Jobs')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('shipping.step4Desc', 'Select completed jobs to include in the shipment. Monitor weight and volume to optimize vehicle capacity.')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[hsl(var(--brand-primary))]">5</span>
                </div>
                <div>
                  <h4 className="font-semibold">{t('shipping.step5Title', 'Track Progress')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('shipping.step5Desc', 'Update shipment status as it progresses: Draft → Planned → Loading → In Transit → Delivered.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[hsl(var(--color-info))]/10 border border-[hsl(var(--color-info))]/20">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-[hsl(var(--color-info))] mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium">{t('shipping.tipTitle', 'Pro Tip:')}</span>{' '}
                  {t('shipping.tipContent', 'Add delivery postal codes to your jobs when creating them. This enables automatic grouping by location for more efficient route planning.')}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
