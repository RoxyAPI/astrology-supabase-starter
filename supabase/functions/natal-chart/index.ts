import { corsHeaders, preflight } from '../_shared/cors.ts';
import { errorResponse, roxyClient } from '../_shared/roxy.ts';
import { requireProjectKey, userClient } from '../_shared/supabase.ts';

/**
 * The private reading. Resolves a city, casts the chart, and stores it only for a signed-in caller.
 *
 * The caller sends a place name, never coordinates. Asking a person for latitude is asking them to
 * be wrong, and the city record carries the IANA timezone, which is the only form that resolves to
 * the correct offset for the DATE of the birth rather than for today.
 */
Deno.serve(async (req) => {
  const refused = preflight(req) ?? requireProjectKey(req);
  if (refused) return refused;

  const body = await req.json().catch(() => ({}));
  const { city, date, time, label } = body as Record<string, unknown>;
  if (typeof city !== 'string' || typeof date !== 'string' || typeof time !== 'string') {
    return new Response(
      JSON.stringify({
        error: 'Send { "city": "New York", "date": "1990-01-15", "time": "14:30:00" }',
        code: 'bad_request',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const roxy = roxyClient();

  const { data: found, error: cityError } = await roxy.location.searchCities({
    query: { q: city, limit: 1 },
  });
  if (cityError) return errorResponse(cityError, corsHeaders);

  const place = found?.cities?.[0];
  if (!place) {
    return new Response(
      JSON.stringify({ error: `No city matched ${city}`, code: 'city_not_found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data: chart, error } = await roxy.astrology.generateNatalChart({
    body: {
      date,
      time,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    },
  });
  if (error) return errorResponse(error, corsHeaders);

  // Anonymous callers get the chart and nothing is stored. A chart is birth data, so it is kept only
  // when there is someone to key it to and a policy that hides it from everyone else.
  const user = await userClient(req);
  if (user) {
    await user.db.from('saved_chart').insert({
      user_id: user.userId,
      label: typeof label === 'string' ? label : place.city,
      birth: { city: place.city, date, time, timezone: place.timezone },
      chart,
    });
  }

  return new Response(JSON.stringify({ place, chart }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
