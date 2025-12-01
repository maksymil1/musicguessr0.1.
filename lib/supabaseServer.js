import { createClient } from '@supabase/supabase-js'

export const supabaseServer = () => {
  return createClient(
    process.env.VITE_NEXT_PUBLIC_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  )
}