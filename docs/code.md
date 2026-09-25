# Code

Owner of the architecture, the conventions and the checks.

## Layout

```
deno.json                      tasks, and the workspace that makes supabase/functions a member
supabase/
  functions/deno.json          the one import map every function and helper resolves through
  functions/daily-horoscope/   index.ts
  functions/natal-chart/       index.ts
  functions/_shared/           cors.ts, roxy.ts, signs.ts, supabase.ts
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

The client is the published npm package. Deno resolves npm packages natively, so there is no bundler.

## One import map

Every bare import in `supabase/functions/` resolves through `supabase/functions/deno.json`, so each dependency
is pinned once. Two things read that one file:

- `supabase functions serve` and `supabase functions deploy`, through `import_map = "./functions/deno.json"`
  on each function in `supabase/config.toml`.
- `deno check`, `deno test` and your editor, because the root `deno.json` declares `supabase/functions` a
  workspace member. That is what makes every file type-check from the repo root with nothing to `cd` into.

A new function gets the same two lines in `config.toml` as the others and no `deno.json` of its own.
`tests/config.test.ts` fails on either mistake. A new dependency goes into `supabase/functions/deno.json`.

## Field names come from the spec, never from memory

Every field this repo reads is in the published OpenAPI document. To check one:

```bash
curl -s https://roxyapi.com/api/v2/openapi.json \
  | jq '.paths."/astrology/natal-chart".post.responses."200".content."application/json".schema.properties | keys'
```

A name that cannot be produced that way does not belong in the code.

## Tests

`deno task test` covers the parts that need no key and no network, so it runs in CI: the sign validation, the
project key check, and the config every function must share, which is `verify_jwt = false`, the one import
map, and no file but `_shared/supabase.ts` reading a Supabase key.

`deno task test:drift` is separate and deliberately not in the per-request path. It fetches the live spec and
asserts every endpoint these functions call still exists and still publishes the fields the demo reads. It
runs weekly on a schedule, so upstream drift arrives as a failed scheduled run rather than as a surprise in
production.

It resolves a `$ref` before reading a schema. A checker that only reads `properties` sees an empty object for
every response declared through a named component, and then passes by finding nothing, which is how this guard
first went green against a schema it had never read.

## Checks before a change ships

| Check                        | Command                                              | Where                    |
| ---------------------------- | ---------------------------------------------------- | ------------------------ |
| Format and lint              | `deno task lint`                                     | CI, pre-commit, pre-push |
| Types, every file            | `deno task check`                                    | CI, pre-commit, pre-push |
| Tests                        | `deno task test`                                     | CI and pre-push          |
| All three in order           | `deno task verify`                                   | by hand                  |
| Upstream drift               | `deno task test:drift`                               | weekly schedule          |
| Migration and policies       | `supabase db reset`, then read `pg_policies`         | locally                  |
| Functions boot and answer    | `supabase functions serve`, then one request each    | locally                  |
| The demo renders real values | drive it in a browser and read the card, never a 200 | locally                  |

The hooks live in `lefthook.yml` and the pre-push hook runs exactly what `.github/workflows/ci.yml` runs, in
the same order. The last three need Docker and a key, so they are maintainer steps rather than CI steps. CI
never calls the API on purpose: a check that calls the API turns someone else deploying into a red pull
request.
