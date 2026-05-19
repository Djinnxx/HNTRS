import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://mojjrzblrmjivdbsusxl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vampyemJscm1qaXZkYnN1c3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAzNDIsImV4cCI6MjA5NDE5NjM0Mn0.ge0x7esqmp2SvztgjvJahTolYvDi3wZ3lcmZdGutcYM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})