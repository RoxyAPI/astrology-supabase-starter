# Database

Owner of the schema, the policies and how the cache stays warm. Every other doc links here rather than
repeating it.

One migration, `supabase/migrations/0000_initial.sql`. It creates two tables that exist for opposite reasons.

## `daily_reading`, the shared cache

A daily horoscope is identical for everyone born under that sign on that date, so it is fetched once and read
by everyone.

| Column         | Type          | Note                          |
| -------------- | ------------- | ----------------------------- |
| `sign`         | `text`        | lower case, part of the key   |
| `reading_date` | `date`        | defaults to `current_date`    |
| `payload`      | `jsonb`       | the whole reading as returned |
| `fetched_at`   | `timestamptz` | when it came from the API     |

Primary key is `(sign, reading_date)`, so a second write for the same day is an upsert and never a duplicate.

Row level security is ON with one policy: anyone may `select`. Nothing may `insert` or `update` through the
anon or authenticated roles. The function writes with the service role, which bypasses policies by design, so
the cache can never be poisoned from a browser.

## `saved_chart`, the private one

A natal chart belongs to the person who asked for it and to nobody else.

| Column       | Type          | Note                                       |
| ------------ | ------------- | ------------------------------------------ |
| `id`         | `uuid`        | generated                                  |
| `user_id`    | `uuid`        | references `auth.users`, cascade on delete |
| `label`      | `text`        | what the person called it                  |
| `birth`      | `jsonb`       | the input, so the chart can be recomputed  |
| `chart`      | `jsonb`       | the response                               |
| `created_at` | `timestamptz` |                                            |

Row level security is ON with four policies, one per verb, each `auth.uid() = user_id`. A signed-in person
reads and writes only their own rows. There is no policy for the anon role, so an unauthenticated request sees
nothing at all rather than an error.

Deleting the account deletes the charts, which is the cascade, not a job.

## Keeping the cache warm

There is deliberately no scheduled job in the migration. The first caller of the day for a sign fills the row
and everyone after them reads it, so the cache needs nothing to work.

A scheduled refresh is possible with `pg_cron` and `pg_net`, and it is left out on purpose: scheduling an HTTP
call from SQL means putting a key where SQL can read it, which is a secret in the database that the rest of
this template is careful not to have. If you want one, hold the key in Vault and read it in the job rather
than writing it into the schedule.

## What is NOT stored

The API key. It lives in project secrets and is read by the function at request time. Nothing in these tables
can be used to call the API.
