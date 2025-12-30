import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nfiahyxnhqvvvgseoxri.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5maWFoeXhuaHF2dnZnc2VveHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzMyNjgsImV4cCI6MjA4MjYwOTI2OH0.7VkRlLUh1FlMfXxFHbNk8_WZL_JO8nrKvy7nAuMglEo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
