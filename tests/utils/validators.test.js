import { describe, it, expect } from 'vitest';
import {
  validateToken,
  validateEmail,
  validatePhoneNumber
} from '../../src/utils/validators.js';

describe('validateToken', () => {
  it('debe retornar false para token vacío', () => {
    expect(validateToken('')).toBe(false);
  });

  it('debe retornar false para null', () => {
    expect(validateToken(null)).toBe(false);
  });

  it('debe retornar false para undefined', () => {
    expect(validateToken(undefined)).toBe(false);
  });

  it('debe retornar false para token de menos de 32 caracteres', () => {
    expect(validateToken('abc123')).toBe(false);
    expect(validateToken('ABCDEF1234567890')).toBe(false);
    expect(validateToken('A'.repeat(31))).toBe(false);
  });

  it('debe retornar false para token con caracteres especiales', () => {
    expect(validateToken('A'.repeat(32) + '!')).toBe(false);
    expect(validateToken('abc-def-ghi-jkl-mno-pqr-stu-vwxy')).toBe(false);
    expect(validateToken('abc def ghi jkl mno pqr stu vwxy')).toBe(false);
  });

  it('debe retornar false para token con espacios aunque sea largo', () => {
    expect(validateToken('ABCDEFGHIJKLMNOPQRSTUVWXYZabcde ')).toBe(false);
  });

  it('debe retornar true para token válido de exactamente 32 caracteres alfanuméricos', () => {
    expect(validateToken('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef')).toBe(true);
    expect(validateToken('A'.repeat(32))).toBe(true);
    expect(validateToken('1234567890123456789012345678901234')).toBe(true);
  });

  it('debe retornar true para token válido de más de 32 caracteres', () => {
    expect(validateToken('A'.repeat(64))).toBe(true);
    expect(validateToken('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop')).toBe(true);
  });

  it('debe retornar false para número en lugar de string', () => {
    expect(validateToken(12345678901234567890123456789012)).toBe(false);
  });
});

describe('validateEmail', () => {
  it('debe validar emails correctos', () => {
    expect(validateEmail('test@ejemplo.com')).toBe(true);
    expect(validateEmail('camarero@camarerosbcn.es')).toBe(true);
    expect(validateEmail('usuario+tag@gmail.com')).toBe(true);
  });

  it('debe rechazar emails incorrectos', () => {
    expect(validateEmail('noesvalido')).toBe(false);
    expect(validateEmail('sin@dominio')).toBe(false);
    expect(validateEmail('@sinusuario.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePhoneNumber', () => {
  it('debe validar números de teléfono correctos', () => {
    expect(validatePhoneNumber('6123456789')).toBe(true);
    expect(validatePhoneNumber('9876543210')).toBe(true);
  });

  it('debe rechazar números incorrectos', () => {
    expect(validatePhoneNumber('123')).toBe(false);
    expect(validatePhoneNumber('abcdefghij')).toBe(false);
    expect(validatePhoneNumber('')).toBe(false);
  });
});
