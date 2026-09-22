# Deploy

Three commands, once you have a Supabase project and an API key.

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy
```

Before the first deploy, set the key as a project secret so only the functions can read it:

```bash
supabase secrets set ROXY_API_KEY=<your key>
```

## What each step does

`db push` applies `supabase/migrations/0000_initial.sql`: two tables and their policies. Nothing is scheduled,
and `docs/database.md` says why.

`functions deploy` uploads both functions. They resolve their npm imports at deploy time, so the first request
is not slower than the rest.

## Locally

```bash
supabase start
supabase functions serve
```

`supabase start` runs the whole stack in Docker, including the database with the migration already applied.
The demo page points at the local function URL by editing one constant at the top of the file.

## After deploying

Call each function once. The first `daily-horoscope` call for a sign writes the cache row; the second returns
it without touching the API, which you can see because the response is identical and immediate.

There is no hosted demo for this template on purpose. You deploy it to your own project, which takes the three
commands above.
