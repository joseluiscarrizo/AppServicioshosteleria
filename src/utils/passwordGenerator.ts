const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Returns a cryptographically secure random integer in the range [0, max).
 * Uses `crypto.getRandomValues` to avoid the weak randomness of `Math.random`.
 */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  // The maximum exclusive value of a Uint32: 2^32 = 0x100000000.
  // We use rejection sampling so that every output value is equally likely
  // and there is no modulo bias.
  const limit = Math.floor(0x100000000 / max) * max;
  let value: number;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  return value % max;
}

export function generatePassword(length: number = 12): string {
  const allChars = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

  // Ensure at least one character from each required group
  const required = [
    UPPERCASE[secureRandomInt(UPPERCASE.length)],
    LOWERCASE[secureRandomInt(LOWERCASE.length)],
    NUMBERS[secureRandomInt(NUMBERS.length)],
    SPECIAL[secureRandomInt(SPECIAL.length)],
  ];

  const remaining: string[] = [];
  for (let i = required.length; i < length; i++) {
    remaining.push(allChars[secureRandomInt(allChars.length)]);
  }

  // Shuffle all characters together using Fisher-Yates with secure randomness
  const all = [...required, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}
