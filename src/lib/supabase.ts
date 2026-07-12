import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (!url || !key) console.warn("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY");
export const supabase = createClient(url || "https://example.supabase.co", key || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
