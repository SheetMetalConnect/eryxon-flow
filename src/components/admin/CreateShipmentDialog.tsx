import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateShipment } from '@/hooks/useShipments';
import { VehicleType, VEHICLE_TYPE_CONFIG } from '@/types/shipping';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Truck,
  Calendar as CalendarIcon,
  MapPin,
  Weight,
  Box,
  User,
  Phone,
  Building,
  Loader2,
} from 'lucide-react';

const formSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scheduled_date: z.date().optional(),
  scheduled_time: z.string().optional(),
  vehicle_type: z.enum(['truck', 'van', 'car', 'bike', 'freight', 'air', 'sea', 'rail', 'other']).optional(),
  vehicle_identifier: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  max_weight_kg: z.number().positive().optional(),
  max_volume_m3: z.number().positive().optional(),
  destination_name: z.string().optional(),
  destination_address: z.string().optional(),
  destination_city: z.string().optional(),
  destination_postal_code: z.string().optional(),
  destination_country: z.string().optional(),
  origin_name: z.string().optional(),
  origin_address: z.string().optional(),
  origin_city: z.string().optional(),
  origin_postal_code: z.string().optional(),
  origin_country: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDestination?: {
    city?: string;
    postal_code?: string;
    country?: string;
  };
}

export default function CreateShipmentDialog({
  open,
  onOpenChange,
  defaultDestination,
}: CreateShipmentDialogProps) {
  const { t } = useTranslation();
  const createShipment = useCreateShipment();
  const [activeTab, setActiveTab] = useState('basic');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination_city: defaultDestination?.city,
      destination_postal_code: defaultDestination?.postal_code,
      destination_country: defaultDestination?.country || 'NL',
      origin_country: 'NL',
    },
  });

  const onSubmit = async (data: FormValues) => {
    await createShipment.mutateAsync({
      ...data,
      scheduled_date: data.scheduled_date ? format(data.scheduled_date, 'yyyy-MM-dd') : undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('shipping.createShipment', 'Create Shipment')}
          </DialogTitle>
          <DialogDescription>
            {t('shipping.createShipmentDescription', 'Create a new shipment to group completed jobs for delivery.')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">{t('shipping.basicInfo', 'Basic Info')}</TabsTrigger>
                <TabsTrigger value="vehicle" className="flex-1">{t('shipping.vehicle', 'Vehicle')}</TabsTrigger>
                <TabsTrigger value="route" className="flex-1">{t('shipping.route', 'Route')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.shipmentName', 'Shipment Name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('shipping.shipmentNamePlaceholder', 'e.g., Rotterdam Delivery')} {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {t('shipping.shipmentNameDesc', 'Optional friendly name for this shipment')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.scheduledDate', 'Scheduled Date')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>{t('shipping.pickDate', 'Pick a date')}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduled_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.scheduledTime', 'Scheduled Time')}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicle_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.vehicleType', 'Vehicle Type')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('shipping.selectVehicle', 'Select vehicle type')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(VEHICLE_TYPE_CONFIG).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4" />
                                  {t(`shipping.vehicleType.${value}`, config.label)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Description')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('shipping.descriptionPlaceholder', 'Add any notes or description...')}
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="vehicle" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vehicle_identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.vehicleId', 'Vehicle ID / Plate')}</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AB-123-CD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="driver_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.driverName', 'Driver Name')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="John Doe" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="driver_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('shipping.driverPhone', 'Driver Phone')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="+31 6 12345678" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    {t('shipping.capacityLimits', 'Capacity Limits')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="max_weight_kg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.maxWeight', 'Max Weight (kg)')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                type="number"
                                placeholder="1000"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_volume_m3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.maxVolume', 'Max Volume (m³)')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Box className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                type="number"
                                step="0.1"
                                placeholder="10"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="route" className="space-y-4 mt-4">
                {/* Origin */}
                <div className="p-4 rounded-lg bg-[hsl(var(--brand-primary))]/5 border border-[hsl(var(--brand-primary))]/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--brand-primary))]" />
                    {t('shipping.origin', 'Origin (Pickup Location)')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="origin_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.locationName', 'Location Name')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder={t('shipping.originNamePlaceholder', 'Your Warehouse')} {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="origin_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.address', 'Address')}</FormLabel>
                          <FormControl>
                            <Input placeholder="Street 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="origin_postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.postalCode', 'Postal Code')}</FormLabel>
                          <FormControl>
                            <Input placeholder="1234 AB" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="origin_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.city', 'City')}</FormLabel>
                          <FormControl>
                            <Input placeholder="Amsterdam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="origin_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.country', 'Country')}</FormLabel>
                          <FormControl>
                            <Input placeholder="NL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Destination */}
                <div className="p-4 rounded-lg bg-[hsl(var(--color-success))]/5 border border-[hsl(var(--color-success))]/20 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--color-success))]" />
                    {t('shipping.destination', 'Destination')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="destination_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.locationName', 'Location Name')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-9" placeholder={t('shipping.destNamePlaceholder', 'Customer Location')} {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="destination_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.address', 'Address')}</FormLabel>
                          <FormControl>
                            <Input placeholder="Street 456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="destination_postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.postalCode', 'Postal Code')}</FormLabel>
                          <FormControl>
                            <Input placeholder="5678 CD" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="destination_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.city', 'City')}</FormLabel>
                          <FormControl>
                            <Input placeholder="Rotterdam" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="destination_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('shipping.country', 'Country')}</FormLabel>
                          <FormControl>
                            <Input placeholder="NL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('shipping.routeNotes', 'Route Notes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('shipping.routeNotesPlaceholder', 'Special delivery instructions, access codes, etc.')}
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" className="cta-button" disabled={createShipment.isPending}>
                {createShipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('shipping.createShipment', 'Create Shipment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
