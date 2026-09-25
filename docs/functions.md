# Edge Functions

Owner of what each function does and what it calls. Endpoint field names come from the published spec; see
`code.md` for how to check them.

Both functions run on Deno and import the typed client from npm with no build step. Both resolve their imports
from the one `supabase/functions/deno.json`; `code.md` has why.

## `daily-horoscope`

`POST` with `{ "sign": "aries" }`.

Reads `daily_reading` first. On a hit it returns the stored payload and never calls the API. On a miss it
calls `GET /astrology/horoscope/{sign}/daily`, writes the row, and returns it. One call per sign per day,
whatever the traffic.

The reading carries `overview`, `love`, `career`, `health`, `finance`, `advice`, `luckyNumber`, `luckyColor`,
`compatibleSigns`, `moonSign`, `moonPhase` and `energyRating`.

## `natal-chart`

`POST` with `{ "city": "New York", "date": "1990-01-15", "time": "14:30:00", "label": "Mine" }`.

Resolves the city first with `GET /location/search`, takes latitude, longitude and the IANA timezone from the
top match, then calls `POST /astrology/natal-chart`. The caller never sends coordinates, because asking a
person for their latitude is asking them to be wrong.

The IANA name matters: it resolves to the correct offset for the birth date, and a fixed numeric offset does
not, so a January birth and a July birth would otherwise share one wrong answer.

When the request carries a signed-in session the chart is saved to `saved_chart` under that user. Without a
session it is returned and not stored. The function verifies the session token itself with
`supabase.auth.getClaims`, then inserts through a client carrying that token, so row level security checks the
write as well. A token that does not verify is treated as no session.

The chart carries `birthDetails`, `planets`, `houses`, `aspects`, `ascendant`, `midheaven` and `summary`.

## Keys and the JWT check

`supabase/functions/_shared/supabase.ts` is the one place the Supabase keys are read. The platform injects
them as `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS`, each a JSON map by key name, and the helper
reads the key named `default`:

| Helper              | Key         | Used by           | Why                                                         |
| ------------------- | ----------- | ----------------- | ----------------------------------------------------------- |
| `adminClient`       | secret      | `daily-horoscope` | writes the shared cache, which no browser role may write    |
| `userClient`        | publishable | `natal-chart`     | saves a chart as the signed-in person, under their policies |
| `requireProjectKey` | either      | both              | answers only a caller that sends one of your project keys   |

Publishable and secret keys are not JWTs, so `supabase/config.toml` sets `verify_jwt = false` for both
functions and `requireProjectKey` checks the caller instead: a request without one of your project keys on the
`apikey` header gets a 401 before anything else runs. Callers send the publishable key on `apikey` and, when
signed in, the session token on `Authorization`, which is what `supabase.functions.invoke` does.
`tests/config.test.ts` fails if a function is added without the setting, and if any file other than the helper
reads a key.

## Errors

The API answers failures with `{ error, code, doc_url }` and no success wrapper. Both functions pass the code
through with the upstream status rather than flattening everything to 500, so a caller can tell a bad birth
date from an outage. Retry 429 and 5xx only.
