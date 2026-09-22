/** The twelve names the API accepts, lower case. */
export const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export type Sign = (typeof SIGNS)[number];

/**
 * Narrows an unknown body field to a sign the API accepts.
 *
 * The SDK types the path parameter as the twelve names, so this check is what makes the call
 * typecheck, and it is also the right validation: a loose pattern would forward any lower case word
 * and turn a typo into an upstream round trip that can only fail.
 */
export function isSign(value: unknown): value is Sign {
  return typeof value === 'string' && (SIGNS as readonly string[]).includes(value);
}
