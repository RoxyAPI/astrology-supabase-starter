import { assert, assertEquals } from '@std/assert';
import { parse } from '@std/toml';
import { requireProjectKey } from '../supabase/functions/_shared/supabase.ts';

const FUNCTIONS = new URL('../supabase/functions/', import.meta.url);
const IMPORT_MAP = './functions/deno.json';

async function functionNames(): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of Deno.readDir(FUNCTIONS)) {
    if (entry.isDirectory && !entry.name.startsWith('_')) names.push(entry.name);
  }
  assert(names.length > 0, 'found no functions, so these checks proved nothing');
  return names.sort();
}

async function sources(): Promise<[string, string][]> {
  const found: [string, string][] = [];
  for (const dir of [...await functionNames(), '_shared']) {
    for await (const entry of Deno.readDir(new URL(`${dir}/`, FUNCTIONS))) {
      if (!entry.name.endsWith('.ts')) continue;
      const path = `${dir}/${entry.name}`;
      found.push([path, await Deno.readTextFile(new URL(path, FUNCTIONS))]);
    }
  }
  return found;
}

Deno.test('every function is configured the same way in config.toml', async () => {
  const config = parse(await Deno.readTextFile(new URL('../supabase/config.toml', import.meta.url))) as {
    functions?: Record<string, { verify_jwt?: boolean; import_map?: string }>;
  };
  for (const name of await functionNames()) {
    // The project keys are not JWTs, so the platform check would refuse them.
    assertEquals(config.functions?.[name]?.verify_jwt, false, `${name} needs verify_jwt = false`);
    // Deploy reads this path, and deno check reads the same file as a workspace member.
    assertEquals(
      config.functions?.[name]?.import_map,
      IMPORT_MAP,
      `${name} needs import_map = "${IMPORT_MAP}"`,
    );
  }
});

Deno.test('no function carries an import map of its own', async () => {
  for (const name of await functionNames()) {
    for (const file of ['deno.json', 'deno.jsonc', 'import_map.json']) {
      const stray = await Deno.stat(new URL(`${name}/${file}`, FUNCTIONS)).then(() => true, () => false);
      assert(!stray, `${name}/${file} would pin a second copy of a dependency`);
    }
  }
});

Deno.test('only the shared helper reads the Supabase keys, and never a legacy one', async () => {
  for (const [path, source] of await sources()) {
    for (const legacy of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
      assert(!source.includes(legacy), `${path} reads ${legacy}`);
    }
    if (path !== '_shared/supabase.ts') {
      assert(!/SUPABASE_(PUBLISHABLE|SECRET)_KEYS/.test(source), `${path} reads a key outside the helper`);
    }
  }
});

Deno.test('a request is served only with a project key on the apikey header', () => {
  Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', JSON.stringify({ default: 'sb_publishable_test' }));
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({ default: 'sb_secret_test' }));
  const call = (headers: HeadersInit) => requireProjectKey(new Request('http://function', { headers }));

  assertEquals(call({ apikey: 'sb_publishable_test' }), null);
  assertEquals(call({ apikey: 'sb_secret_test' }), null);
  assertEquals(call({})?.status, 401);
  assertEquals(call({ apikey: 'sb_publishable_other' })?.status, 401);
  assertEquals(call({ Authorization: 'Bearer sb_publishable_test' })?.status, 401);
});
