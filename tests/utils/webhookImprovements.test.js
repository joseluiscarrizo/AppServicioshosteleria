import { describe, it, expect, vi } from 'vitest';
import { ValidationError, handleWebhookError } from '../../src/utils/webhookImprovements.js';

describe('ValidationError', () => {
  it('debe crear un error con mensaje correcto', () => {
    const error = new ValidationError('Token inválido');
    expect(error.message).toBe('Token inválido');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });

  it('debe tener el nombre correcto', () => {
    const error = new ValidationError('test');
    expect(error.name).toBe('ValidationError');
  });
});

describe('handleWebhookError', () => {
  it('debe manejar ValidationError con su mensaje', () => {
    const error = new ValidationError('Datos de webhook inválidos');
    const resultado = handleWebhookError(error);
    expect(typeof resultado).toBe('string');
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('debe manejar errores de red/fetch', () => {
    const error = new TypeError('Failed to fetch');
    const resultado = handleWebhookError(error);
    expect(typeof resultado).toBe('string');
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('debe manejar errores genéricos', () => {
    const error = new Error('Error interno del servidor');
    const resultado = handleWebhookError(error);
    expect(typeof resultado).toBe('string');
  });

  it('debe manejar null/undefined sin lanzar excepción', () => {
    expect(() => handleWebhookError(null)).not.toThrow();
    expect(() => handleWebhookError(undefined)).not.toThrow();
  });
});
