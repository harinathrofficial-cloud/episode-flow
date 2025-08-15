import { createClient } from '@supabase/supabase-js'

// Lovable native Supabase integration - no env vars needed
export const supabase = createClient(
  'https://placeholder.supabase.co', 
  'placeholder-key'
)