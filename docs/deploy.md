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
echo "ROXY_API_KEY=<your key>" > supabase/functions/.env
supabase start
supabase functions serve
```

The `.env` file is how the local functions get the key, and it is gitignored. `supabase start` runs the whole
stack in Docker, including the database with the migration already applied. It prints a publishable key and a
secret key. The demo page already points at the local function URL, so paste the publishable key into it. The
secret key stays with the stack, which injects both into the functions.

## After deploying

The functions read the publishable and secret keys of the project, so create them first if your project shows
only the legacy anon and service_role keys: Settings, API Keys, then create new API keys. Call each function
once with the publishable key on the `apikey` header. The first `daily-horoscope` call for a sign writes the
cache row; the second returns it without touching the API, which you can see because the response is identical
and immediate.

There is no hosted demo for this template on purpose. You deploy it to your own project, which takes the three
commands above.
