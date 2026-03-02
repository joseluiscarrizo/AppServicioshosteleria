import { describe, it, expect } from 'vitest';
import { validarFichaje } from '../../src/utils/fichajeValidation';
const TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';

describe('validarFichaje', () => {
  it('permite entrada sin hora_entrada_real', () => {
    expect(validarFichaje('entrada', { hora_entrada_real: null, hora_salida_real: null }, TOKEN).valido).toBe(true);
  });
  it('rechaza entrada si ya registrada', () => {
    expect(validarFichaje('entrada', { hora_entrada_real: '09:00', hora_salida_real: null }, TOKEN).valido).toBe(false);
  });
  it('rechaza salida sin entrada previa', () => {
    expect(validarFichaje('salida', { hora_entrada_real: null, hora_salida_real: null }, TOKEN).valido).toBe(false);
  });
  it('permite salida con entrada y sin salida', () => {
    expect(validarFichaje('salida', { hora_entrada_real: '09:00', hora_salida_real: null }, TOKEN).valido).toBe(true);
  });
  it('rechaza salida si ya registrada', () => {
    expect(validarFichaje('salida', { hora_entrada_real: '09:00', hora_salida_real: '18:00' }, TOKEN).valido).toBe(false);
  });
  it('rechaza token vacío', () => {
    expect(validarFichaje('entrada', { hora_entrada_real: null, hora_salida_real: null }, '').valido).toBe(false);
  });
  it('rechaza token corto', () => {
    expect(validarFichaje('entrada', { hora_entrada_real: null, hora_salida_real: null }, 'corto').valido).toBe(false);
  });
});
