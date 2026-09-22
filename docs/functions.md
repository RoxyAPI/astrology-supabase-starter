# Edge Functions

Owner of what each function does and what it calls. Endpoint field names come from the published spec; see
`code.md` for how to check them.

Both functions run on Deno and import the typed client from npm with no build step. Each has its own
`deno.json`.

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
session it is returned and not stored.

The chart carries `birthDetails`, `planets`, `houses`, `aspects`, `ascendant`, `midheaven` and `summary`.

## Errors

The API answers failures with `{ error, code, doc_url }` and no success wrapper. Both functions pass the code
through with the upstream status rather than flattening everything to 500, so a caller can tell a bad birth
date from an outage. Retry 429 and 5xx only.
