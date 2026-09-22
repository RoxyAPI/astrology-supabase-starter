import { assert } from '@std/assert';

/**
 * Upstream drift, checked on a schedule rather than in the request path.
 *
 * This fetches the live OpenAPI document and asserts that every endpoint these functions call still
 * exists and still publishes the fields they read. It needs the network and no key, which is why it
 * runs weekly on its own workflow instead of in CI: a dependency bump should never go red because
 * someone else is deploying.
 */
const SPEC = 'https://roxyapi.com/api/v2/openapi.json';

type Schema = { $ref?: string; properties?: Record<string, unknown> };

type Spec = {
  paths: Record<
    string,
    Record<string, {
      responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
    }>
  >;
  components?: { schemas?: Record<string, Schema> };
};

let spec: Spec | undefined;

async function load(): Promise<Spec> {
  if (!spec) spec = (await (await fetch(SPEC)).json()) as Spec;
  return spec;
}

/**
 * Follows one `$ref` into `components.schemas`.
 *
 * Some responses are declared inline and some through a named component, so a checker that only
 * reads `properties` sees an empty object for half the API and passes by finding nothing. That is
 * how this test first went green against a schema it had never actually read.
 */
function resolve(doc: Spec, schema?: Schema): Schema | undefined {
  if (!schema?.$ref) return schema;
  const name = schema.$ref.split('/').pop();
  return name ? doc.components?.schemas?.[name] : undefined;
}

function fields(doc: Spec, path: string, method: string): string[] {
  const op = doc.paths[path]?.[method];
  const schema = resolve(doc, op?.responses?.['200']?.content?.['application/json']?.schema);
  return Object.keys(schema?.properties ?? {});
}

Deno.test('every endpoint these functions call still exists', async () => {
  const doc = await load();
  for (
    const [path, method] of [
      ['/astrology/horoscope/{sign}/daily', 'get'],
      ['/location/search', 'get'],
      ['/astrology/natal-chart', 'post'],
    ] as const
  ) {
    assert(doc.paths[path]?.[method], `${method.toUpperCase()} ${path} is gone from the published spec`);
  }
});

Deno.test('the city record still carries what a chart needs', async () => {
  const doc = await load();
  const city = doc.paths['/location/search']?.get?.responses?.['200']
    ?.content?.['application/json']?.schema as {
      properties?: { cities?: { items?: { properties?: Record<string, unknown> } } };
    } | undefined;
  const props = Object.keys(city?.properties?.cities?.items?.properties ?? {});
  for (const field of ['latitude', 'longitude', 'timezone']) {
    assert(props.includes(field), `location.search no longer returns ${field}`);
  }
});

Deno.test('the daily reading still carries the fields the demo renders', async () => {
  const doc = await load();
  const props = fields(doc, '/astrology/horoscope/{sign}/daily', 'get');
  assert(props.length > 0, 'read no fields at all, so this check proved nothing');
  for (const field of ['overview', 'love', 'career', 'luckyNumber', 'luckyColor']) {
    assert(props.includes(field), `the daily horoscope no longer returns ${field}`);
  }
});

Deno.test('the natal chart still carries the fields the demo renders', async () => {
  const doc = await load();
  const props = fields(doc, '/astrology/natal-chart', 'post');
  assert(props.length > 0, 'read no fields at all, so this check proved nothing');
  for (const field of ['planets', 'houses', 'ascendant', 'summary']) {
    assert(props.includes(field), `the natal chart no longer returns ${field}`);
  }
});
