import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client. SERVER ONLY — bypasses RLS.
 * Used solely for Auth admin operations (sending invitations).
 * Always authorize the caller with requireRole() before using it.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.startsWith("your-")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }
  return createClient<Database>(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const hasServiceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(key && !key.startsWith("your-"));
};
