import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role. SOLO para uso server-side en scripts
 * administrativos o rutas API protegidas. Salta RLS. No exponer al cliente.
 */
export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
