import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface RatedName {
  id: number
  name: string
  is_blacklisted: boolean
  comments?: string
  created_at: string
}

export interface NameRating {
  id: number
  name_id: number
  dimension_key: string
  parent_id: string
  rating: number
  created_at: string
  updated_at: string
}

export interface NameWeight {
  id: number
  dimension_key: string
  weight: number
  created_at: string
  updated_at: string
} 