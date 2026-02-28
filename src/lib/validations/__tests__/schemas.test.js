import { describe, it, expect } from 'vitest';
import {
  camareroSchema,
  pedidoSchema,
  clienteSchema,
  coordinadorSchema,
  mensajeChatSchema,
  fichajeTokenSchema,
  validate,
} from '../schemas.js';

describe('Zod Validation Schemas', () => {
  // ─── camareroSchema ─────────────────────────────────────────────────────────
  describe('camareroSchema', () => {
    it('should accept valid camarero data', () => {
      const result = camareroSchema.safeParse({
        nombre: 'Juan García',
        email: 'juan@ejemplo.com',
        telefono: '+34600000000',
        especialidad: 'general',
        nivel_experiencia: 'intermedio',
        disponible: true,
        en_reserva: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty nombre', () => {
      const result = camareroSchema.safeParse({ nombre: '' });
      expect(result.success).toBe(false);
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('nombre');
    });

    it('should reject invalid email', () => {
      const result = camareroSchema.safeParse({ nombre: 'Juan', email: 'not-an-email' });
      expect(result.success).toBe(false);
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('email');
    });

    it('should accept empty email (optional)', () => {
      const result = camareroSchema.safeParse({ nombre: 'Juan', email: '' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid especialidad', () => {
      const result = camareroSchema.safeParse({ nombre: 'Juan', especialidad: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid especialidad values', () => {
      const valid = ['general', 'cocteleria', 'banquetes', 'eventos_vip', 'buffet'];
      for (const especialidad of valid) {
        const result = camareroSchema.safeParse({ nombre: 'Juan', especialidad });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid nivel_experiencia', () => {
      const result = camareroSchema.safeParse({ nombre: 'Juan', nivel_experiencia: 'maestro' });
      expect(result.success).toBe(false);
    });
  });

  // ─── pedidoSchema ────────────────────────────────────────────────────────────
  describe('pedidoSchema', () => {
    const validPedido = {
      cliente: 'Empresa Test S.L.',
      lugar_evento: 'Salón Gran Vía',
      dia: '2026-03-15',
    };

    it('should accept valid pedido data', () => {
      const result = pedidoSchema.safeParse(validPedido);
      expect(result.success).toBe(true);
    });

    it('should reject missing cliente', () => {
      const result = pedidoSchema.safeParse({ ...validPedido, cliente: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing lugar_evento', () => {
      const result = pedidoSchema.safeParse({ ...validPedido, lugar_evento: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = pedidoSchema.safeParse({ ...validPedido, dia: '15/03/2026' });
      expect(result.success).toBe(false);
    });

    it('should accept valid date format YYYY-MM-DD', () => {
      const result = pedidoSchema.safeParse({ ...validPedido, dia: '2026-12-31' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid client email', () => {
      const result = pedidoSchema.safeParse({
        ...validPedido,
        cliente_email_1: 'bad-email',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty optional emails', () => {
      const result = pedidoSchema.safeParse({
        ...validPedido,
        cliente_email_1: '',
        cliente_email_2: '',
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── clienteSchema ───────────────────────────────────────────────────────────
  describe('clienteSchema', () => {
    it('should accept valid client data', () => {
      const result = clienteSchema.safeParse({
        nombre: 'Hotel Ritz',
        email: 'ritz@hotel.es',
        telefono: '+34912345678',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty nombre', () => {
      const result = clienteSchema.safeParse({ nombre: '' });
      expect(result.success).toBe(false);
    });

    it('should accept client without email or phone', () => {
      const result = clienteSchema.safeParse({ nombre: 'Hotel Ritz' });
      expect(result.success).toBe(true);
    });
  });

  // ─── coordinadorSchema ───────────────────────────────────────────────────────
  describe('coordinadorSchema', () => {
    it('should accept valid coordinator data', () => {
      const result = coordinadorSchema.safeParse({
        nombre: 'María López',
        email: 'maria@empresa.com',
        telefono: '+34666000000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty nombre', () => {
      const result = coordinadorSchema.safeParse({ nombre: '' });
      expect(result.success).toBe(false);
    });
  });

  // ─── mensajeChatSchema ───────────────────────────────────────────────────────
  describe('mensajeChatSchema', () => {
    it('should accept valid message', () => {
      const result = mensajeChatSchema.safeParse({
        contenido: 'Hola a todos',
        grupo_id: 'grupo-123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message content', () => {
      const result = mensajeChatSchema.safeParse({
        contenido: '',
        grupo_id: 'grupo-123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject message that is too long', () => {
      const result = mensajeChatSchema.safeParse({
        contenido: 'a'.repeat(5001),
        grupo_id: 'grupo-123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing grupo_id', () => {
      const result = mensajeChatSchema.safeParse({
        contenido: 'Hola',
        grupo_id: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── fichajeTokenSchema ──────────────────────────────────────────────────────
  describe('fichajeTokenSchema', () => {
    it('should accept valid token', () => {
      const result = fichajeTokenSchema.safeParse({ token: 'abc123token' });
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const result = fichajeTokenSchema.safeParse({ token: '' });
      expect(result.success).toBe(false);
    });
  });

  // ─── validate helper ─────────────────────────────────────────────────────────
  describe('validate helper', () => {
    it('should return success:true and data for valid input', () => {
      const result = validate(camareroSchema, { nombre: 'Juan' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return success:false and errors for invalid input', () => {
      const result = validate(camareroSchema, { nombre: '' });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.nombre).toBeTruthy();
    });

    it('should collect first error per field', () => {
      const result = validate(pedidoSchema, {
        cliente: '',
        lugar_evento: '',
        dia: 'invalid',
      });
      expect(result.success).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});
