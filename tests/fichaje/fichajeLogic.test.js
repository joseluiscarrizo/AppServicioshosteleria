import { describe, it, expect } from 'vitest';

function validarFichaje(tipo, asignacion, token) {
  if (!token || typeof token !== 'string' || token.trim().length < 32) {
    return { valido: false, error: 'Token no válido.' };
  }
  if (tipo !== 'entrada' && tipo !== 'salida') {
    return { valido: false, error: 'Tipo no reconocido.' };
  }
  if (tipo === 'salida' && !asignacion?.hora_entrada_real) {
    return { valido: false, error: 'Debes registrar la entrada antes de registrar la salida.' };
  }
  if (tipo === 'entrada' && asignacion?.hora_entrada_real) {
    return { valido: false, error: 'La entrada ya ha sido registrada.' };
  }
  if (tipo === 'salida' && asignacion?.hora_salida_real) {
    return { valido: false, error: 'La salida ya ha sido registrada.' };
  }
  return { valido: true, error: null };
}

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
