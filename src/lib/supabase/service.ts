import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Bypasses Row Level Security entirely — only for trusted server-only code
 * paths that implement their own authorization (e.g. the calendar ICS feed,
 * authenticated by a per-user secret token rather than a Supabase session).
 * Never expose this client's queries to arbitrary user input without an
 * explicit authorization check first.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
