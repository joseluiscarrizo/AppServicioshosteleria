import { describe, test, expect, vi, beforeAll } from 'vitest';
import { generatePassword } from '@/utils/passwordGenerator';

// Provide a test-safe crypto.getRandomValues implementation
beforeAll(() => {
  let counter = 0;
  vi.stubGlobal('crypto', {
    getRandomValues: (array: Uint32Array) => {
      for (let i = 0; i < array.length; i++) {
    // LCG constants (Numerical Recipes): deterministic but varied values so
    // that consecutive calls produce different passwords without real randomness.
    array[i] = (counter++ * 1664525 + 1013904223) >>> 0;
      }
      return array;
    },
  });
});

describe('generatePassword', () => {
  test('returns a string of the requested length', () => {
    expect(generatePassword(12)).toHaveLength(12);
    expect(generatePassword(16)).toHaveLength(16);
    expect(generatePassword(20)).toHaveLength(20);
  });

  test('contains at least one uppercase letter', () => {
    const password = generatePassword(12);
    expect(/[A-Z]/.test(password)).toBe(true);
  });

  test('contains at least one lowercase letter', () => {
    const password = generatePassword(12);
    expect(/[a-z]/.test(password)).toBe(true);
  });

  test('contains at least one digit', () => {
    const password = generatePassword(12);
    expect(/[0-9]/.test(password)).toBe(true);
  });

  test('contains at least one special character', () => {
    const password = generatePassword(12);
    expect(/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password)).toBe(true);
  });

  test('generates different passwords on consecutive calls', () => {
    const a = generatePassword(12);
    const b = generatePassword(12);
    // With a varied counter-based RNG the two passwords should differ
    expect(a).not.toBe(b);
  });

  test('defaults to length 12', () => {
    expect(generatePassword()).toHaveLength(12);
  });
});
