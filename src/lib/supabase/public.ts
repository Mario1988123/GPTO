import { createClient } from "@supabase/supabase-js";

/**
 * Cliente sin sesión para rutas públicas (/t/[qr]). Usa la anon key,
 * así que las policies RLS `TO anon` aplican.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
