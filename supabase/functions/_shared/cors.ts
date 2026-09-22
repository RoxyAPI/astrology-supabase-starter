/**
 * Permissive CORS because the demo page is served from anywhere, including a local file.
 *
 * Narrow `Access-Control-Allow-Origin` to your own site before you ship. It does not protect the API
 * key, which is never in the browser, but it does decide who may spend your quota through you.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Answers the preflight. Returns null when the request is not one. */
export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}
