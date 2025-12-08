/**
 * Shipping domain tables: shipments, shipment_jobs
 * Logistics and delivery management
 */

import type { Json } from '../base'
import type { DatabaseEnums } from '../enums'

export type ShipmentsTable = {
  Row: {
    actual_arrival: string | null
    actual_departure: string | null
    created_at: string | null
    created_by: string | null
    currency: string | null
    current_volume_m3: number | null
    current_weight_kg: number | null
    description: string | null
    destination_address: string | null
    destination_city: string | null
    destination_country: string | null
    destination_lat: number | null
    destination_lng: number | null
    destination_name: string | null
    destination_postal_code: string | null
    distance_km: number | null
    driver_name: string | null
    driver_phone: string | null
    estimated_arrival: string | null
    estimated_duration_minutes: number | null
    id: string
    items_count: number | null
    max_height_cm: number | null
    max_length_cm: number | null
    max_volume_m3: number | null
    max_weight_kg: number | null
    max_width_cm: number | null
    metadata: Json | null
    name: string | null
    notes: string | null
    origin_address: string | null
    origin_city: string | null
    origin_country: string | null
    origin_lat: number | null
    origin_lng: number | null
    origin_name: string | null
    origin_postal_code: string | null
    route_notes: string | null
    scheduled_date: string | null
    scheduled_time: string | null
    shipment_number: string
    shipping_cost: number | null
    status: DatabaseEnums["shipment_status"]
    tenant_id: string
    updated_at: string | null
    vehicle_identifier: string | null
    vehicle_type: DatabaseEnums["vehicle_type"] | null
  }
  Insert: {
    actual_arrival?: string | null
    actual_departure?: string | null
    created_at?: string | null
    created_by?: string | null
    currency?: string | null
    current_volume_m3?: number | null
    current_weight_kg?: number | null
    description?: string | null
    destination_address?: string | null
    destination_city?: string | null
    destination_country?: string | null
    destination_lat?: number | null
    destination_lng?: number | null
    destination_name?: string | null
    destination_postal_code?: string | null
    distance_km?: number | null
    driver_name?: string | null
    driver_phone?: string | null
    estimated_arrival?: string | null
    estimated_duration_minutes?: number | null
    id?: string
    items_count?: number | null
    max_height_cm?: number | null
    max_length_cm?: number | null
    max_volume_m3?: number | null
    max_weight_kg?: number | null
    max_width_cm?: number | null
    metadata?: Json | null
    name?: string | null
    notes?: string | null
    origin_address?: string | null
    origin_city?: string | null
    origin_country?: string | null
    origin_lat?: number | null
    origin_lng?: number | null
    origin_name?: string | null
    origin_postal_code?: string | null
    route_notes?: string | null
    scheduled_date?: string | null
    scheduled_time?: string | null
    shipment_number: string
    shipping_cost?: number | null
    status?: DatabaseEnums["shipment_status"]
    tenant_id: string
    updated_at?: string | null
    vehicle_identifier?: string | null
    vehicle_type?: DatabaseEnums["vehicle_type"] | null
  }
  Update: {
    actual_arrival?: string | null
    actual_departure?: string | null
    created_at?: string | null
    created_by?: string | null
    currency?: string | null
    current_volume_m3?: number | null
    current_weight_kg?: number | null
    description?: string | null
    destination_address?: string | null
    destination_city?: string | null
    destination_country?: string | null
    destination_lat?: number | null
    destination_lng?: number | null
    destination_name?: string | null
    destination_postal_code?: string | null
    distance_km?: number | null
    driver_name?: string | null
    driver_phone?: string | null
    estimated_arrival?: string | null
    estimated_duration_minutes?: number | null
    id?: string
    items_count?: number | null
    max_height_cm?: number | null
    max_length_cm?: number | null
    max_volume_m3?: number | null
    max_weight_kg?: number | null
    max_width_cm?: number | null
    metadata?: Json | null
    name?: string | null
    notes?: string | null
    origin_address?: string | null
    origin_city?: string | null
    origin_country?: string | null
    origin_lat?: number | null
    origin_lng?: number | null
    origin_name?: string | null
    origin_postal_code?: string | null
    route_notes?: string | null
    scheduled_date?: string | null
    scheduled_time?: string | null
    shipment_number?: string
    shipping_cost?: number | null
    status?: DatabaseEnums["shipment_status"]
    tenant_id?: string
    updated_at?: string | null
    vehicle_identifier?: string | null
    vehicle_type?: DatabaseEnums["vehicle_type"] | null
  }
  Relationships: [
    {
      foreignKeyName: "shipments_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "shipments_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type ShipmentJobsTable = {
  Row: {
    created_at: string | null
    delivered_at: string | null
    delivery_notes: string | null
    delivery_signature: string | null
    id: string
    job_id: string
    loaded_at: string | null
    loaded_by: string | null
    loading_sequence: number | null
    metadata: Json | null
    notes: string | null
    packages_count: number | null
    shipment_id: string
    tenant_id: string
    updated_at: string | null
    volume_m3: number | null
    weight_kg: number | null
  }
  Insert: {
    created_at?: string | null
    delivered_at?: string | null
    delivery_notes?: string | null
    delivery_signature?: string | null
    id?: string
    job_id: string
    loaded_at?: string | null
    loaded_by?: string | null
    loading_sequence?: number | null
    metadata?: Json | null
    notes?: string | null
    packages_count?: number | null
    shipment_id: string
    tenant_id: string
    updated_at?: string | null
    volume_m3?: number | null
    weight_kg?: number | null
  }
  Update: {
    created_at?: string | null
    delivered_at?: string | null
    delivery_notes?: string | null
    delivery_signature?: string | null
    id?: string
    job_id?: string
    loaded_at?: string | null
    loaded_by?: string | null
    loading_sequence?: number | null
    metadata?: Json | null
    notes?: string | null
    packages_count?: number | null
    shipment_id?: string
    tenant_id?: string
    updated_at?: string | null
    volume_m3?: number | null
    weight_kg?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "shipment_jobs_job_id_fkey"
      columns: ["job_id"]
      isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "shipment_jobs_loaded_by_fkey"
      columns: ["loaded_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "shipment_jobs_shipment_id_fkey"
      columns: ["shipment_id"]
      isOneToOne: false
      referencedRelation: "shipments"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "shipment_jobs_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type ShippingTables = {
  shipments: ShipmentsTable
  shipment_jobs: ShipmentJobsTable
}
