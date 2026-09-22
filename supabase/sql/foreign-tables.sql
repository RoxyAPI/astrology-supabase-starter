-- Query RoxyAPI as Postgres tables, without an Edge Function.
--
-- Optional. Nothing else in this repo depends on it, and the limits are in docs/sql.md: reads only,
-- a fixed request body per table, and an auto-imported table for every body-taking endpoint that
-- errors until you give it one or drop it.
--
-- Run this in the SQL editor, not as a migration: it holds a key and a wrapper version, and neither
-- belongs in a file that every environment replays.
--
-- Take the current version and checksum from https://fdw.dev/catalog/openapi/ before you run it.
-- The pair below was verified on 2026-09-22 and will age.

create extension if not exists wrappers with schema extensions;

create foreign data wrapper wasm_wrapper
  handler wasm_fdw_handler
  validator wasm_fdw_validator;

-- Store the key in Vault rather than inline for anything but a scratch project, then pass
-- `api_key_id '<key id>'` instead of `api_key`.
create server roxy_server
  foreign data wrapper wasm_wrapper
  options (
    fdw_package_url 'https://github.com/supabase/wrappers/releases/download/wasm_openapi_fdw_v0.2.1/openapi_fdw.wasm',
    fdw_package_name 'supabase:openapi-fdw',
    fdw_package_version '0.2.1',
    fdw_package_checksum '12c902f3089e18142a1d8d35c66b9ceb85c193224229687bd929aff6b44cddde',
    base_url 'https://roxyapi.com/api/v2',
    spec_url 'https://roxyapi.com/api/v2/openapi.json',
    api_key 'replace_with_your_key',
    api_key_header 'X-API-Key',
    api_key_prefix ''
  );

create schema if not exists roxy;

-- Writes a table per endpoint, named from the full path, so names carry their domain and do not
-- collide. Drop the ones you do not use, especially the body-taking ones.
import foreign schema openapi from server roxy_server into roxy;

-- A catalogue read, which is what this path is best at.
select id, name, element from roxy.astrology_signs limit 3;

-- A value in the path comes from the where clause.
create foreign table roxy.daily_horoscope (
  sign text,
  overview text,
  love text,
  career text,
  lucky_number integer,
  lucky_color text,
  attrs jsonb
)
server roxy_server
options (endpoint '/astrology/horoscope/{sign}/daily');

select sign, lucky_number, lucky_color from roxy.daily_horoscope where sign = 'aries';

-- A reading that takes a body is a table with the body written into it, which is also why one table
-- cannot serve a different chart per visitor.
create foreign table roxy.life_path (
  number integer,
  type text,
  calculation text,
  meaning jsonb,
  has_karmic_debt boolean,
  attrs jsonb
)
server roxy_server
options (
  endpoint '/numerology/life-path',
  method 'POST',
  request_body '{"year":1990,"month":7,"day":15}'
);

select number, type, calculation from roxy.life_path;
