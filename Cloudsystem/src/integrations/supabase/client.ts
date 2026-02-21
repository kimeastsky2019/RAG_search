import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jbwuiizzrpcesfjspzsz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impid3VpaXp6cnBjZXNmanNwenN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNjI2NTUsImV4cCI6MjA4MTgzODY1NX0.rcb7FfFoLl5EIzc-WR1QGJTx--w28vQRd5rk1lvP-8M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// For React:
// import { supabase } from "@/integrations/supabase/client";
// For React Native:
// import { supabase } from "@/src/integrations/supabase/client";
