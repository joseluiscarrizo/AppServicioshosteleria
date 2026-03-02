import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateToken } from '../../src/utils/validators.js';

// Mock base44 client
vi.mock('../../src/api/base44Client', () => ({
  base44: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Lógica de validación de fichaje QR', () => {
  describe('validateToken en contexto de fichaje', () => {
    it('token generado por generarTokensQR debe ser válido (32 chars alfanuméricos)', () => {
      // Simular el algoritmo de generarTokensQR.ts
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      expect(validateToken(token)).toBe(true);
      expect(token).toHaveLength(32);
    });

    it('token de URL con caracteres especiales debe ser rechazado', () => {
      expect(validateToken('token=invalido&con=params')).toBe(false);
      expect(validateToken('<script>alert(1)</script>')).toBe(false);
      expect(validateToken('../../etc/passwd')).toBe(false);
    });

    it('token vacío de URL debe ser rechazado', () => {
      expect(validateToken(null)).toBe(false);
      expect(validateToken(undefined)).toBe(false);
      expect(validateToken('')).toBe(false);
    });
  });

  describe('Lógica de validación de estado de fichaje', () => {
    const validarFichaje = (tipo, asig, token) => {
      if (!validateToken(token)) return 'Token no válido. No se puede registrar el fichaje.';
      if (tipo !== 'entrada' && tipo !== 'salida') return 'Tipo de fichaje no reconocido.';
      if (tipo === 'salida' && !asig?.hora_entrada_real) return 'Debes registrar la entrada antes de registrar la salida.';
      if (tipo === 'entrada' && asig?.hora_entrada_real) return 'La entrada ya ha sido registrada.';
      if (tipo === 'salida' && asig?.hora_salida_real) return 'La salida ya ha sido registrada.';
      return null;
    };

    const tokenValido = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';

    it('debe permitir entrada cuando no hay hora_entrada_real', () => {
      const asig = { hora_entrada_real: null, hora_salida_real: null };
      expect(validarFichaje('entrada', asig, tokenValido)).toBeNull();
    });

    it('debe rechazar entrada si ya está registrada', () => {
      const asig = { hora_entrada_real: '09:00', hora_salida_real: null };
      expect(validarFichaje('entrada', asig, tokenValido)).toBe('La entrada ya ha sido registrada.');
    });

    it('debe rechazar salida si no hay entrada previa', () => {
      const asig = { hora_entrada_real: null, hora_salida_real: null };
      expect(validarFichaje('salida', asig, tokenValido)).toBe('Debes registrar la entrada antes de registrar la salida.');
    });

    it('debe permitir salida cuando hay entrada y no hay salida', () => {
      const asig = { hora_entrada_real: '09:00', hora_salida_real: null };
      expect(validarFichaje('salida', asig, tokenValido)).toBeNull();
    });

    it('debe rechazar salida si ya está registrada', () => {
      const asig = { hora_entrada_real: '09:00', hora_salida_real: '18:00' };
      expect(validarFichaje('salida', asig, tokenValido)).toBe('La salida ya ha sido registrada.');
    });

    it('debe rechazar tipo desconocido', () => {
      const asig = { hora_entrada_real: null, hora_salida_real: null };
      expect(validarFichaje('descanso', asig, tokenValido)).toBe('Tipo de fichaje no reconocido.');
    });

    it('debe rechazar con token inválido independientemente del tipo', () => {
      const asig = { hora_entrada_real: null, hora_salida_real: null };
      expect(validarFichaje('entrada', asig, 'corto')).toBe('Token no válido. No se puede registrar el fichaje.');
    });
  });
});
