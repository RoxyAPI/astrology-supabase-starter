import { assert, assertFalse } from '@std/assert';
import { isSign, SIGNS } from '../supabase/functions/_shared/signs.ts';

Deno.test('every listed sign is accepted', () => {
  for (const sign of SIGNS) assert(isSign(sign));
});

Deno.test('the twelve are all of them', () => {
  assert(SIGNS.length === 12);
});

// A loose pattern check used to live here and accepted any lower case word, which turned a typo into
// an upstream round trip that could only fail. These are the shapes that regressed it.
Deno.test('a word that is not a sign is rejected', () => {
  for (const value of ['banana', 'ARIES', 'aries ', '', 'aries;drop', 'leo1']) assertFalse(isSign(value));
});

Deno.test('a non-string is rejected without throwing', () => {
  for (const value of [undefined, null, 7, {}, ['aries']]) assertFalse(isSign(value));
});
