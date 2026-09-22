# Reading the API as SQL

Optional and independent of the functions. Nothing in this repo depends on it.

Supabase ships a generic OpenAPI foreign data wrapper, so endpoints can be queried as tables.
`supabase/sql/foreign-tables.sql` sets it up against the published spec.

It suits catalogue and daily content: decks, hexagrams, dream symbols, crystals, sign reference data and a
daily reading per sign.

Three limits decide whether it fits, and the first two fail quietly rather than loudly.

- **The request body is fixed per table.** One table is one request, so a different chart per visitor belongs
  in an Edge Function, not here.
- **`import foreign schema` also writes a table for every endpoint that takes a body**, and those carry no
  body, so they error until given one or dropped.
- **Reads only.** Foreign tables here are for `select`.

Take the wrapper version and checksum from the Supabase wrapper catalog at the time you run it, never from a
copy in a README.
