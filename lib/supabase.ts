import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Task = {
  id: number
  app: string
  room: string
  cat: string
  label: string
  blocked_by_ids: number[]
  assignees: string[]
  purchases: { name: string; price: number | null }[]
  done: boolean
}
