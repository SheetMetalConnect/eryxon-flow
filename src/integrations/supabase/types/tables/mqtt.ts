/**
 * MQTT domain tables: mqtt_publishers, mqtt_logs
 * MQTT broker integration and logging
 */

import type { Json } from '../base'

export type MqttPublishersTable = {
  Row: {
    active: boolean | null
    broker_url: string
    created_at: string | null
    created_by: string | null
    default_area: string | null
    default_enterprise: string | null
    default_site: string | null
    description: string | null
    events: string[]
    id: string
    last_connected_at: string | null
    last_error: string | null
    name: string
    password: string | null
    port: number
    tenant_id: string
    topic_pattern: string
    updated_at: string | null
    use_tls: boolean | null
    username: string | null
  }
  Insert: {
    active?: boolean | null
    broker_url: string
    created_at?: string | null
    created_by?: string | null
    default_area?: string | null
    default_enterprise?: string | null
    default_site?: string | null
    description?: string | null
    events?: string[]
    id?: string
    last_connected_at?: string | null
    last_error?: string | null
    name: string
    password?: string | null
    port?: number
    tenant_id: string
    topic_pattern?: string
    updated_at?: string | null
    use_tls?: boolean | null
    username?: string | null
  }
  Update: {
    active?: boolean | null
    broker_url?: string
    created_at?: string | null
    created_by?: string | null
    default_area?: string | null
    default_enterprise?: string | null
    default_site?: string | null
    description?: string | null
    events?: string[]
    id?: string
    last_connected_at?: string | null
    last_error?: string | null
    name?: string
    password?: string | null
    port?: number
    tenant_id?: string
    topic_pattern?: string
    updated_at?: string | null
    use_tls?: boolean | null
    username?: string | null
  }
  Relationships: [
    {
      foreignKeyName: "mqtt_publishers_created_by_fkey"
      columns: ["created_by"]
      isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "mqtt_publishers_tenant_id_fkey"
      columns: ["tenant_id"]
      isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },
  ]
}

export type MqttLogsTable = {
  Row: {
    created_at: string | null
    error_message: string | null
    event_type: string
    id: string
    latency_ms: number | null
    mqtt_publisher_id: string
    payload: Json
    success: boolean
    topic: string
  }
  Insert: {
    created_at?: string | null
    error_message?: string | null
    event_type: string
    id?: string
    latency_ms?: number | null
    mqtt_publisher_id: string
    payload: Json
    success?: boolean
    topic: string
  }
  Update: {
    created_at?: string | null
    error_message?: string | null
    event_type?: string
    id?: string
    latency_ms?: number | null
    mqtt_publisher_id?: string
    payload?: Json
    success?: boolean
    topic?: string
  }
  Relationships: [
    {
      foreignKeyName: "mqtt_logs_mqtt_publisher_id_fkey"
      columns: ["mqtt_publisher_id"]
      isOneToOne: false
      referencedRelation: "mqtt_publishers"
      referencedColumns: ["id"]
    },
  ]
}

export type MqttTables = {
  mqtt_publishers: MqttPublishersTable
  mqtt_logs: MqttLogsTable
}
