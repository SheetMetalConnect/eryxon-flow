/**
 * Base types for Supabase integration
 * Contains fundamental types used across all table definitions
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type InternalSupabaseConfig = {
  PostgrestVersion: "13.0.5"
}
