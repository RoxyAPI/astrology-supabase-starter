import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from './cors.ts';

/**
 * The one place the Supabase project keys are read.
 *
 * The platform injects them as `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS`, each a JSON map
 * by key name, and the key a project is created with is named `default`. They are not JWTs, so the
 * platform JWT check is off for every function and `requireProjectKey` does that job instead.
 */
function keys(name: 'SUPABASE_PUBLISHABLE_KEYS' | 'SUPABASE_SECRET_KEYS'): Record<string, string> {
  return JSON.parse(Deno.env.get(name) ?? '{}');
}

/**
 * Refuses a request that does not carry one of the project keys on the `apikey` header.
 *
 * The publishable key is public, so this is not a secret check. It keeps the functions answering only
 * callers that were given your project, which is what spends your quota. Returns null when the key
 * matches.
 */
export function requireProjectKey(req: Request): Response | null {
  const sent = req.headers.get('apikey');
  const known = [
    ...Object.values(keys('SUPABASE_PUBLISHABLE_KEYS')),
    ...Object.values(keys('SUPABASE_SECRET_KEYS')),
  ];
  if (sent && known.includes(sent)) return null;
  return new Response(
    JSON.stringify({ error: 'Send your project publishable key on the apikey header', code: 'unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/** Runs as the `service_role` database role and bypasses row level security. Server side only. */
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, keys('SUPABASE_SECRET_KEYS').default);
}

/**
 * Runs as whoever the session token names, under their row level security policies.
 *
 * Returns null unless the token verifies, so a caller without a valid session is never mistaken for
 * one with it.
 */
export async function userClient(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, keys('SUPABASE_PUBLISHABLE_KEYS').default, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await db.auth.getClaims(token);
  return data?.claims.sub ? { db, userId: data.claims.sub } : null;
}
