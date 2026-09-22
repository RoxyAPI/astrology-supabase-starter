# Code

Owner of the architecture, the conventions and the checks.

## Layout

```
supabase/
  functions/daily-horoscope/   index.ts + deno.json
  functions/natal-chart/       index.ts + deno.json
  functions/_shared/           cors.ts, roxy.ts
  migrations/0000_initial.sql
  sql/foreign-tables.sql       optional, see sql.md
  config.toml
demo/index.html
tests/
```

## The API client

One place, `supabase/functions/_shared/roxy.ts`. It reads `ROXY_API_KEY` from the environment and returns the
typed client. A function never constructs its own client and never calls `fetch` against the API directly, so
the key is read in exactly one file.

The client is the published npm package, imported through each function `deno.json` import map. Deno resolves
npm packages natively, so there is no bundler and no lockfile to keep.

## Field names come from the spec, never from memory

Every field this repo reads is in the published OpenAPI document. To check one:

```bash
curl -s https://roxyapi.com/api/v2/openapi.json \
  | jq '.paths."/astrology/natal-chart".post.responses."200".content."application/json".schema.properties | keys'
```

A name that cannot be produced that way does not belong in the code.

## Tests

`deno test` covers the pure parts: the cache key, the error mapping, and the shape the functions return. They
run without a key and without network, because a test that needs a secret is a test that does not run in CI.

`deno task test:drift` is separate and deliberately not in the per-request path. It fetches the live spec and
asserts every endpoint these functions call still exists and still publishes the fields the demo reads. It
runs weekly on a schedule, so upstream drift arrives as a failed scheduled run rather than as a surprise in
production.

It resolves a `$ref` before reading a schema. A checker that only reads `properties` sees an empty object for
every response declared through a named component, and then passes by finding nothing, which is how this guard
first went green against a schema it had never read.

## Checks before a change ships

| Check                        | Command                                              | Where             |
| ---------------------------- | ---------------------------------------------------- | ----------------- |
| Format and lint              | `deno task lint`                                     | CI and pre-commit |
| Types                        | `deno task check`                                    | CI and pre-commit |
| Tests                        | `deno task test`                                     | CI and pre-push   |
| Everything above             | `deno task verify`                                   | pre-push          |
| Upstream drift               | `deno task test:drift`                               | weekly schedule   |
| Migration and policies       | `supabase db reset`, then read `pg_policies`         | locally           |
| Functions boot and answer    | `supabase functions serve`, then one request each    | locally           |
| The demo renders real values | drive it in a browser and read the card, never a 200 | locally           |

The last three need Docker and a key, so they are maintainer steps rather than CI steps. CI stays offline on
purpose: a check that calls the API turns someone else deploying into a red pull request.
