# AGENTS.md

A Supabase backend for astrology readings. Two Edge Functions call RoxyAPI, Postgres caches the shared daily
readings and stores private charts under row level security, and one static page demonstrates both. Deploys to
your own Supabase project in three commands. MIT, so rebrand it and ship it.

## Canonical RoxyAPI references (use these, do not guess)

Prefer these live sources over memory for any RoxyAPI path, field, SDK method, or limit. They are always
current.

- **Docs MCP (no API key):** connect `https://roxyapi.com/mcp/docs` (Streamable HTTP, one tool `search_docs`).
  Ask it for any endpoint, field, auth detail, or integration step instead of hardcoding a path.
  `{ "mcpServers": { "roxy-docs": { "type": "http", "url": "https://roxyapi.com/mcp/docs" } } }`
- **Agent playbook:** `https://roxyapi.com/AGENTS.md`, implementation rules for building on RoxyAPI.
- **Discovery context:** `https://roxyapi.com/llms.txt` (concise) and `https://roxyapi.com/llms-full.txt`
  (deep).
- **Live OpenAPI spec:** `https://roxyapi.com/api/v2/openapi.json`, the source of truth for every field and
  example. Never invent a response field.
- **Live playground:** `https://roxyapi.com/api-reference`. **Supabase guide:**
  `https://roxyapi.com/docs/integrations/supabase`.

## Setup

- Get an API key at https://roxyapi.com/pricing
- `supabase secrets set ROXY_API_KEY=<your key>`
- `supabase link --project-ref <ref>`, then `supabase db push`, then `supabase functions deploy`

The key is a project secret, read by `supabase/functions/_shared/roxy.ts` and nowhere else. If you add a
function, import that helper rather than reading the environment again.

## Endpoints this repo calls

| Endpoint                                | Where             | Why                                                         |
| --------------------------------------- | ----------------- | ----------------------------------------------------------- |
| `GET /astrology/horoscope/{sign}/daily` | `daily-horoscope` | the shared daily reading, cached per sign per day           |
| `GET /location/search`                  | `natal-chart`     | resolves a city to latitude, longitude and an IANA timezone |
| `POST /astrology/natal-chart`           | `natal-chart`     | the chart itself                                            |

Everything else RoxyAPI offers is one more function on the same pattern. The domain guides list what to call
for what: `https://roxyapi.com/docs`.

## To change X, read Y

| Change                               | Read                |
| ------------------------------------ | ------------------- |
| the schema, a policy, the refresh    | `docs/database.md`  |
| what a function does or returns      | `docs/functions.md` |
| adding a function, tests, the checks | `docs/code.md`      |
| deploying, or running it locally     | `docs/deploy.md`    |
| querying the API as SQL instead      | `docs/sql.md`       |
| the demo page                        | `docs/demo.md`      |

## Conventions

- One place reads the key: `supabase/functions/_shared/roxy.ts`. A function never builds its own client.
- Every response field used here exists in the live spec. Check with `jq` before adding one; `docs/code.md`
  has the command.
- Resolve a city, never ask for coordinates, and keep the IANA timezone rather than an offset.
- Errors pass through as `{ error, code, doc_url }` with the upstream status. Retry 429 and 5xx only.
- Row level security is on for both tables. The cache is readable by anyone and writable only by the service
  role; a saved chart is readable and writable only by the person it belongs to.

## Staying current

The API adds endpoints and fields; it does not remove them without a version. The weekly drift check asserts
every endpoint here still exists, so an upstream change arrives as a failed scheduled run rather than a broken
deploy. Update the pinned client with your usual dependency flow.
