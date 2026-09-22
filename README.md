# Astrology on Supabase

Serve astrology readings from your own Supabase project. Two Edge Functions call
[RoxyAPI](https://roxyapi.com), Postgres caches the shared daily readings and keeps private charts under row
level security, and the API key never leaves a project secret. One API key covers 18+ insight domains, every
calculation verified against NASA JPL Horizons. MIT, so rebrand it and ship it.

[![Get API Key](https://img.shields.io/badge/Get_API_Key-roxyapi.com-0b7285?style=for-the-badge)](https://roxyapi.com/pricing)
[![Try API Live](https://img.shields.io/badge/Try_API_Live-api--reference-1864ab?style=for-the-badge)](https://roxyapi.com/api-reference)
[![Remote MCP](https://img.shields.io/badge/Remote_MCP-for_agents-5f3dc4?style=for-the-badge)](https://roxyapi.com/docs/mcp)
[![Methodology](https://img.shields.io/badge/Methodology-how_it_is_verified-2b8a3e?style=for-the-badge)](https://roxyapi.com/methodology)
[![Supabase guide](https://img.shields.io/badge/Supabase_guide-three_paths-0b7285?style=for-the-badge)](https://roxyapi.com/docs/integrations/supabase)
[![More templates](https://img.shields.io/badge/More_templates-open_source-495057?style=for-the-badge)](https://roxyapi.com/templates)

## What you get

| Piece             | What it does                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `daily-horoscope` | Reads the cache first. On a miss it calls the API once, stores the row, and every later reader that day is served from your database |
| `natal-chart`     | Resolves a birth city to coordinates and an IANA timezone, casts the chart, and saves it only for a signed-in caller                 |
| `daily_reading`   | Shared cache, readable by anyone, writable only by the service role                                                                  |
| `saved_chart`     | Private, one policy per verb, every row keyed to `auth.uid()`                                                                        |
| `demo/index.html` | One page, no framework, renders both through the published web components                                                            |

## Quickstart

```bash
supabase secrets set ROXY_API_KEY=your_key_here
supabase link --project-ref your-project-ref
supabase db push && supabase functions deploy
```

Get a key at [roxyapi.com/pricing](https://roxyapi.com/pricing). To run it locally instead, `supabase start`
then `supabase functions serve`, and open `demo/index.html`.

## Endpoints it calls

| Endpoint                                | Used by                            |
| --------------------------------------- | ---------------------------------- |
| `GET /astrology/horoscope/{sign}/daily` | `daily-horoscope`                  |
| `GET /location/search`                  | `natal-chart`, to resolve the city |
| `POST /astrology/natal-chart`           | `natal-chart`                      |

Every other domain is one more function on the same pattern. The [domain guides](https://roxyapi.com/docs) say
which endpoint answers which question.

## How it looks

| Light                                                                                                                                                                       | Dark                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img src="https://raw.githubusercontent.com/RoxyAPI/astrology-supabase-starter/main/screenshots/desktop-light.png" alt="The demo page in light mode" width="420">           | <img src="https://raw.githubusercontent.com/RoxyAPI/astrology-supabase-starter/main/screenshots/desktop-dark.png" alt="The demo page in dark mode" width="420">           |
| <img src="https://raw.githubusercontent.com/RoxyAPI/astrology-supabase-starter/main/screenshots/mobile-light.png" alt="The demo page on a phone in light mode" width="200"> | <img src="https://raw.githubusercontent.com/RoxyAPI/astrology-supabase-starter/main/screenshots/mobile-dark.png" alt="The demo page on a phone in dark mode" width="200"> |

## Stack

| Part                    | Version                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| Supabase Edge Functions | Deno 2                                                                            |
| Typed client            | `@roxyapi/sdk` 1.x, imported with an npm specifier, no build step                 |
| UI components           | `@roxyapi/ui` from the CDN, used in controlled mode so no key reaches the browser |
| Database                | Postgres with row level security on both tables                                   |

## Where the key lives

In a project secret, read inside a function with `Deno.env.get`. It is never in a table, never in the demo
page, and never in a variable a browser can read. Browser code that has to call the API directly uses a
publishable key locked to your origin: see [widgets](https://roxyapi.com/docs/widgets).

## Docs

Start with [AGENTS.md](https://github.com/RoxyAPI/astrology-supabase-starter/blob/main/AGENTS.md), which
routes to the rest.

| Read                                                                                                   | For                                 |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| [docs/database.md](https://github.com/RoxyAPI/astrology-supabase-starter/blob/main/docs/database.md)   | the schema, the policies, the cache |
| [docs/functions.md](https://github.com/RoxyAPI/astrology-supabase-starter/blob/main/docs/functions.md) | what each function does             |
| [docs/deploy.md](https://github.com/RoxyAPI/astrology-supabase-starter/blob/main/docs/deploy.md)       | deploying and running it locally    |
| [docs/sql.md](https://github.com/RoxyAPI/astrology-supabase-starter/blob/main/docs/sql.md)             | querying the API as SQL instead     |
| [docs/code.md](https://github.com/RoxyAPI/astrology-supabase-starter/blob/main/docs/code.md)           | architecture, tests, the checks     |

## Built with RoxyAPI

One key, 18+ insight domains, typed SDKs in five languages, Remote MCP for agents, and flat pricing with every
domain included. [Pricing](https://roxyapi.com/pricing) . [Docs](https://roxyapi.com/docs) .
[Remote MCP](https://roxyapi.com/docs/mcp) . [Methodology](https://roxyapi.com/methodology) .
[Templates](https://roxyapi.com/templates)

## License

MIT. Clone it, rebrand it, and ship it under your own brand.
