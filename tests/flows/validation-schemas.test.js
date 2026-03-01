import { describe, test, expect } from 'vitest';
import { ClienteSchema, CamareroSchema } from '../../src/lib/validation-schemas.js';

describe('Validation Schemas', () => {
  describe('ClienteSchema', () => {
    test('accepts valid cliente data', () => {
      const result = ClienteSchema.safeParse({
        nombre: 'Empresa ABC',
        email: 'empresa@example.com',
        telefono: '1234567890',
        codigo: 'CLI001'
      });
      expect(result.success).toBe(true);
    });

    test('accepts cliente without optional fields', () => {
      const result = ClienteSchema.safeParse({
        nombre: 'Empresa ABC',
        codigo: 'CLI001'
      });
      expect(result.success).toBe(true);
    });

    test('rejects nombre too short', () => {
      const result = ClienteSchema.safeParse({
        nombre: 'A',
        codigo: 'CLI001'
      });
      expect(result.success).toBe(false);
    });

    test('rejects invalid email', () => {
      const result = ClienteSchema.safeParse({
        nombre: 'Empresa ABC',
        email: 'not-an-email',
        codigo: 'CLI001'
      });
      expect(result.success).toBe(false);
    });

    test('rejects telefono with wrong format', () => {
      const result = ClienteSchema.safeParse({
        nombre: 'Empresa ABC',
        telefono: '123',
        codigo: 'CLI001'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CamareroSchema', () => {
    test('accepts valid camarero data', () => {
      const result = CamareroSchema.safeParse({
        nombre: 'Juan García',
        email: 'juan@example.com',
        telefono: '1234567890',
        codigo: 'CAM001'
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing required email', () => {
      const result = CamareroSchema.safeParse({
        nombre: 'Juan García',
        telefono: '1234567890',
        codigo: 'CAM001'
      });
      expect(result.success).toBe(false);
    });

    test('rejects missing required telefono', () => {
      const result = CamareroSchema.safeParse({
        nombre: 'Juan García',
        email: 'juan@example.com',
        codigo: 'CAM001'
      });
      expect(result.success).toBe(false);
    });
  });
});
