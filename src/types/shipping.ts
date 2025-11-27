/**
 * Shipping Management Types
 *
 * Type definitions for the shipping management system including
 * shipments, shipment-job relationships, and related enums.
 */

// ============================================================================
// Enums
// ============================================================================

export type ShipmentStatus =
  | 'draft'
  | 'planned'
  | 'loading'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type VehicleType =
  | 'truck'
  | 'van'
  | 'car'
  | 'bike'
  | 'freight'
  | 'air'
  | 'sea'
  | 'rail'
  | 'other';

// ============================================================================
// Shipment Types
// ============================================================================

export interface Shipment {
  id: string;
  tenant_id: string;

  // Identification
  shipment_number: string;
  name: string | null;
  description: string | null;

  // Status and scheduling
  status: ShipmentStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  actual_departure: string | null;
  actual_arrival: string | null;
  estimated_arrival: string | null;

  // Vehicle information
  vehicle_type: VehicleType | null;
  vehicle_identifier: string | null;
  driver_name: string | null;
  driver_phone: string | null;

  // Capacity constraints
  max_weight_kg: number | null;
  max_volume_m3: number | null;
  max_length_cm: number | null;
  max_width_cm: number | null;
  max_height_cm: number | null;

  // Current load
  current_weight_kg: number;
  current_volume_m3: number;
  items_count: number;

  // Destination information
  destination_name: string | null;
  destination_address: string | null;
  destination_city: string | null;
  destination_postal_code: string | null;
  destination_country: string | null;
  destination_lat: number | null;
  destination_lng: number | null;

  // Origin information
  origin_name: string | null;
  origin_address: string | null;
  origin_city: string | null;
  origin_postal_code: string | null;
  origin_country: string | null;
  origin_lat: number | null;
  origin_lng: number | null;

  // Route information
  distance_km: number | null;
  estimated_duration_minutes: number | null;
  route_notes: string | null;

  // Cost tracking
  shipping_cost: number | null;
  currency: string | null;

  // Additional data
  notes: string | null;
  metadata: ShipmentMetadata | null;

  // Audit fields
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentMetadata {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tracking_number?: string;
  carrier?: string;
  carrier_service?: string;
  insurance_value?: number;
  customs_declaration?: string;
  special_instructions?: string;
  temperature_controlled?: boolean;
  hazardous_goods?: boolean;
  fragile?: boolean;
  [key: string]: unknown;
}

// ============================================================================
// Shipment Job (Junction) Types
// ============================================================================

export interface ShipmentJob {
  id: string;
  shipment_id: string;
  job_id: string;
  tenant_id: string;

  // Item details
  weight_kg: number | null;
  volume_m3: number | null;
  packages_count: number;

  // Loading information
  loading_sequence: number | null;
  loaded_at: string | null;
  loaded_by: string | null;

  // Delivery status
  delivered_at: string | null;
  delivery_notes: string | null;
  delivery_signature: string | null;

  // Additional
  notes: string | null;
  metadata: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export interface ShipmentWithJobs extends Shipment {
  shipment_jobs?: ShipmentJobWithJob[];
}

export interface ShipmentJobWithJob extends ShipmentJob {
  job?: {
    id: string;
    job_number: string;
    customer: string | null;
    status: string;
    due_date: string | null;
    delivery_address: string | null;
    delivery_city: string | null;
    delivery_postal_code: string | null;
    total_weight_kg: number | null;
    total_volume_m3: number | null;
    package_count: number | null;
  };
}

export interface ShipmentJobWithShipment extends ShipmentJob {
  shipment?: Shipment;
}

// ============================================================================
// Form/Input Types
// ============================================================================

export interface CreateShipmentInput {
  name?: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  vehicle_type?: VehicleType;
  vehicle_identifier?: string;
  driver_name?: string;
  driver_phone?: string;
  max_weight_kg?: number;
  max_volume_m3?: number;
  max_length_cm?: number;
  max_width_cm?: number;
  max_height_cm?: number;
  destination_name?: string;
  destination_address?: string;
  destination_city?: string;
  destination_postal_code?: string;
  destination_country?: string;
  origin_name?: string;
  origin_address?: string;
  origin_city?: string;
  origin_postal_code?: string;
  origin_country?: string;
  shipping_cost?: number;
  currency?: string;
  notes?: string;
  metadata?: ShipmentMetadata;
}

export interface UpdateShipmentInput extends Partial<CreateShipmentInput> {
  status?: ShipmentStatus;
  actual_departure?: string;
  actual_arrival?: string;
  estimated_arrival?: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  route_notes?: string;
}

export interface AddJobToShipmentInput {
  shipment_id: string;
  job_id: string;
  weight_kg?: number;
  volume_m3?: number;
  packages_count?: number;
  loading_sequence?: number;
  notes?: string;
}

// ============================================================================
// Stats/Analytics Types
// ============================================================================

export interface ShipmentStats {
  total: number;
  draft: number;
  planned: number;
  loading: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
  scheduledToday: number;
  scheduledThisWeek: number;
  totalWeight: number;
  totalVolume: number;
}

export interface ShipmentsByPostalCode {
  postal_code: string;
  city: string | null;
  count: number;
  total_weight: number;
  shipments: Shipment[];
}

export interface ShipmentsByDate {
  date: string;
  count: number;
  shipments: Shipment[];
}

// ============================================================================
// Filter Types
// ============================================================================

export interface ShipmentFilters {
  status?: ShipmentStatus[];
  vehicle_type?: VehicleType[];
  scheduled_date_from?: string;
  scheduled_date_to?: string;
  destination_city?: string;
  destination_postal_code?: string;
  search?: string;
}

// ============================================================================
// Map/Visualization Types
// ============================================================================

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'origin' | 'destination' | 'stop';
  label: string;
  shipment?: Shipment;
  jobs_count?: number;
}

export interface PostalCodeGroup {
  postal_code: string;
  city: string | null;
  country: string | null;
  lat?: number;
  lng?: number;
  jobs: Array<{
    id: string;
    job_number: string;
    customer: string | null;
    status: string;
    weight_kg: number | null;
    volume_m3: number | null;
  }>;
  total_weight: number;
  total_volume: number;
  total_packages: number;
}

// ============================================================================
// Status Configuration
// ============================================================================

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  }
> = {
  draft: {
    label: 'Draft',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    icon: 'FileEdit',
  },
  planned: {
    label: 'Planned',
    color: 'text-[hsl(var(--color-info))]',
    bgColor: 'bg-[hsl(var(--color-info))]/20',
    borderColor: 'border-[hsl(var(--color-info))]/30',
    icon: 'Calendar',
  },
  loading: {
    label: 'Loading',
    color: 'text-[hsl(var(--color-warning))]',
    bgColor: 'bg-[hsl(var(--color-warning))]/20',
    borderColor: 'border-[hsl(var(--color-warning))]/30',
    icon: 'Package',
  },
  in_transit: {
    label: 'In Transit',
    color: 'text-[hsl(var(--brand-primary))]',
    bgColor: 'bg-[hsl(var(--brand-primary))]/20',
    borderColor: 'border-[hsl(var(--brand-primary))]/30',
    icon: 'Truck',
  },
  delivered: {
    label: 'Delivered',
    color: 'text-[hsl(var(--color-success))]',
    bgColor: 'bg-[hsl(var(--color-success))]/20',
    borderColor: 'border-[hsl(var(--color-success))]/30',
    icon: 'CheckCircle2',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-[hsl(var(--color-error))]',
    bgColor: 'bg-[hsl(var(--color-error))]/20',
    borderColor: 'border-[hsl(var(--color-error))]/30',
    icon: 'XCircle',
  },
};

export const VEHICLE_TYPE_CONFIG: Record<
  VehicleType,
  {
    label: string;
    icon: string;
    description: string;
  }
> = {
  truck: {
    label: 'Truck',
    icon: 'Truck',
    description: 'Large truck for heavy loads',
  },
  van: {
    label: 'Van',
    icon: 'Bus',
    description: 'Medium-sized van',
  },
  car: {
    label: 'Car',
    icon: 'Car',
    description: 'Small deliveries by car',
  },
  bike: {
    label: 'Bike/Courier',
    icon: 'Bike',
    description: 'Bicycle or motorcycle courier',
  },
  freight: {
    label: 'Freight',
    icon: 'Container',
    description: 'Freight carrier service',
  },
  air: {
    label: 'Air Freight',
    icon: 'Plane',
    description: 'Air cargo shipment',
  },
  sea: {
    label: 'Sea Freight',
    icon: 'Ship',
    description: 'Maritime shipping',
  },
  rail: {
    label: 'Rail',
    icon: 'Train',
    description: 'Railway freight',
  },
  other: {
    label: 'Other',
    icon: 'Package',
    description: 'Other delivery method',
  },
};
