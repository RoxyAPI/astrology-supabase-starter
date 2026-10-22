import { createRoxy } from '@roxyapi/sdk';

/**
 * The one place the API key is read.
 *
 * Set it with `supabase secrets set ROXY_API_KEY=...`. It is a project secret, so it exists inside a
 * function and nowhere a browser can reach. A function that built its own client would be a second
 * place to leak it from, which is why there is only this one.
 */
export function roxyClient() {
  const key = Deno.env.get('ROXY_API_KEY');
  if (!key) throw new Error('ROXY_API_KEY is not set. Run: supabase secrets set ROXY_API_KEY=...');
  return createRoxy(key);
}

/** The API error contract, passed through instead of flattened. */
type RoxyError = { error: string; code: string; doc_url?: string };

/**
 * Turns an SDK error into a response that keeps the upstream status.
 *
 * The status is on the HTTP response, not in the error body, so callers pass both. Collapsing everything
 * to one status would tell a caller that a bad birth date and an outage are the same event, and they
 * retry differently: 4xx never succeeds on a retry, 429 and 5xx do. No response means the request never
 * got an answer, which is a 502.
 */
export function errorResponse(
  error: unknown,
  response: Response | undefined,
  headers: HeadersInit,
): Response {
  const e = error as Partial<RoxyError>;
  return new Response(
    JSON.stringify({
      error: e?.error ?? 'Upstream request failed',
      code: e?.code ?? 'upstream_error',
      doc_url: e?.doc_url,
    }),
    { status: response?.status ?? 502, headers: { ...headers, 'Content-Type': 'application/json' } },
  );
}
