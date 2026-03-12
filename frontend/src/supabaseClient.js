import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_KEY env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
  },
});

export default supabase;
