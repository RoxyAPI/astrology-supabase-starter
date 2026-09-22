import { createClient } from '@supabase/supabase-js';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { errorResponse, roxyClient } from '../_shared/roxy.ts';
import { isSign } from '../_shared/signs.ts';

/**
 * The shared reading. One upstream call per sign per day, whatever the traffic.
 *
 * The cache is checked before the API and written after it, so nothing has to be scheduled: the
 * first caller of the day fills the row and everyone after them reads it. That is why the migration
 * ships no cron job, which would have meant a key in the database.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const { sign } = await req.json().catch(() => ({ sign: undefined }));
  if (!isSign(sign)) {
    return new Response(
      JSON.stringify({
        error: 'Send a zodiac sign, lower case, as { "sign": "aries" }',
        code: 'bad_request',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // The service role bypasses row level security, which is what lets this function write a table no
  // browser may write. It is injected by the platform and is never one of your own secrets.
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: cached } = await db
    .from('daily_reading')
    .select('payload')
    .eq('sign', sign)
    .eq('reading_date', new Date().toISOString().slice(0, 10))
    .maybeSingle();

  if (cached?.payload) {
    return new Response(JSON.stringify({ cached: true, reading: cached.payload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const roxy = roxyClient();
  const { data, error } = await roxy.astrology.getDailyHoroscope({ path: { sign } });
  if (error) return errorResponse(error, corsHeaders);

  await db.from('daily_reading').upsert(
    { sign, payload: data, fetched_at: new Date().toISOString() },
    { onConflict: 'sign,reading_date' },
  );

  return new Response(JSON.stringify({ cached: false, reading: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
