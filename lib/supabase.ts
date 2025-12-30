import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (_supabase) return _supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

export type Project = {
  id: string
  name: string
  room: 'art' | 'minerva' | 'startup' | 'jobhunt' | 'vault'
  description: string | null
  last_activity: string
  mist_opacity: number
  priority_score: number
}

export type Task = {
  id: string
  project_id: string
  description: string
  estimated_minutes: number
  completed: boolean
}
