import { describe, it, expect } from 'vitest';
import { validateToken, validateEmail, validatePhoneNumber } from '../../src/utils/validators.js';

describe('validateToken', () => {
  it('retorna false para token vacío', () => { expect(validateToken('')).toBe(false); });
  it('retorna false para null', () => { expect(validateToken(null)).toBe(false); });
  it('retorna false para token menor de 32 chars', () => { expect(validateToken('abc123')).toBe(false); });
  it('retorna false para token con caracteres especiales', () => { expect(validateToken('abc-def-ghi-jkl-mno-pqr-stu-vwxy')).toBe(false); });
  it('retorna true para token válido de 32 chars alfanuméricos', () => { expect(validateToken('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef')).toBe(true); });
  it('retorna true para token válido de más de 32 chars', () => { expect(validateToken('A'.repeat(64))).toBe(true); });
  it('retorna false para número en lugar de string', () => { expect(validateToken(12345678901234567890123456789012)).toBe(false); });
});

describe('validateEmail', () => {
  it('valida emails correctos', () => { expect(validateEmail('test@ejemplo.com')).toBe(true); });
  it('rechaza emails incorrectos', () => { expect(validateEmail('noesvalido')).toBe(false); expect(validateEmail('')).toBe(false); });
});

describe('validatePhoneNumber', () => {
  it('valida números correctos', () => { expect(validatePhoneNumber('612345678')).toBe(true); });
  it('rechaza números incorrectos', () => { expect(validatePhoneNumber('123')).toBe(false); expect(validatePhoneNumber('')).toBe(false); });
});
