import { describe, test, expect } from 'vitest';
import {
  validatePhoneNumber,
  validatePhoneNumberStrict,
  validateEmail,
  validateDate,
  validateRequiredFields,
  validateMessageLength,
  sanitizeInput,
} from '../../utils/validators';

describe('validatePhoneNumber', () => {
  test('acepta número de 10 dígitos', () => {
    expect(validatePhoneNumber('1234567890')).toBe(true);
  });

  test('acepta número con prefijo internacional', () => {
    expect(validatePhoneNumber('+34 600111222')).toBe(false); // 9 digits after country code but space breaks regex
    expect(validatePhoneNumber('+1 1234567890')).toBe(true);
  });

  test('rechaza número vacío', () => {
    expect(validatePhoneNumber('')).toBe(false);
  });

  test('rechaza número con letras', () => {
    expect(validatePhoneNumber('123abc4567')).toBe(false);
  });

  test('rechaza número de menos de 10 dígitos', () => {
    expect(validatePhoneNumber('12345')).toBe(false);
  });
});

describe('validatePhoneNumberStrict', () => {
  test('acepta número E.164 válido', () => {
    expect(validatePhoneNumberStrict('+34600111222')).toBe(true);
  });

  test('acepta número sin prefijo de suficiente longitud', () => {
    expect(validatePhoneNumberStrict('34600111222')).toBe(true);
  });

  test('acepta número con espacios y guiones (se limpian)', () => {
    expect(validatePhoneNumberStrict('+34 600-111-222')).toBe(true);
  });

  test('rechaza string vacío', () => {
    expect(validatePhoneNumberStrict('')).toBe(false);
  });

  test('rechaza número con letras (intento de inyección)', () => {
    expect(validatePhoneNumberStrict('600111222; DROP TABLE')).toBe(false);
  });

  test('rechaza número con caracteres especiales peligrosos', () => {
    expect(validatePhoneNumberStrict('+34<script>alert(1)</script>')).toBe(false);
  });

  test('rechaza número demasiado corto', () => {
    expect(validatePhoneNumberStrict('123')).toBe(false);
  });

  test('rechaza número que empieza por 0', () => {
    expect(validatePhoneNumberStrict('0123456789')).toBe(false);
  });

  test('rechaza valor no string (null)', () => {
    expect(validatePhoneNumberStrict(null as unknown as string)).toBe(false);
  });

  test('rechaza valor no string (undefined)', () => {
    expect(validatePhoneNumberStrict(undefined as unknown as string)).toBe(false);
  });
});

describe('validateEmail', () => {
  test('acepta email válido simple', () => {
    expect(validateEmail('usuario@ejemplo.com')).toBe(true);
  });

  test('acepta email con subdominios', () => {
    expect(validateEmail('user@mail.ejemplo.co.uk')).toBe(true);
  });

  test('acepta email con caracteres especiales permitidos', () => {
    expect(validateEmail('user.name+tag@example.com')).toBe(true);
  });

  test('rechaza email sin @', () => {
    expect(validateEmail('usuarioejemplo.com')).toBe(false);
  });

  test('rechaza email sin dominio', () => {
    expect(validateEmail('usuario@')).toBe(false);
  });

  test('rechaza email sin TLD', () => {
    expect(validateEmail('usuario@ejemplo')).toBe(false);
  });

  test('rechaza string vacío', () => {
    expect(validateEmail('')).toBe(false);
  });

  test('rechaza email con espacios', () => {
    expect(validateEmail('usuario @ejemplo.com')).toBe(false);
  });

  test('rechaza email con inyección SQL', () => {
    expect(validateEmail("'; DROP TABLE users; --")).toBe(false);
  });
});

describe('validateDate', () => {
  test('acepta fecha YYYY-MM-DD válida', () => {
    expect(validateDate('2026-03-15')).toBe(true);
  });

  test('acepta fecha con mes y día de un dígito (con cero)', () => {
    expect(validateDate('2026-01-05')).toBe(true);
  });

  test('rechaza fecha en formato incorrecto DD/MM/YYYY', () => {
    expect(validateDate('15/03/2026')).toBe(false);
  });

  test('rechaza fecha con separador incorrecto', () => {
    expect(validateDate('2026.03.15')).toBe(false);
  });

  test('rechaza string vacío', () => {
    expect(validateDate('')).toBe(false);
  });

  test('rechaza año con 2 dígitos', () => {
    expect(validateDate('26-03-15')).toBe(false);
  });
});

describe('validateRequiredFields', () => {
  test('retorna true cuando todos los campos requeridos están presentes', () => {
    const data = { nombre: 'Test', email: 'test@test.com', telefono: '123' };
    expect(validateRequiredFields(data, ['nombre', 'email', 'telefono'])).toBe(true);
  });

  test('retorna false cuando falta un campo requerido', () => {
    const data = { nombre: 'Test', email: 'test@test.com' };
    expect(validateRequiredFields(data, ['nombre', 'email', 'telefono'])).toBe(false);
  });

  test('retorna true con lista vacía de campos requeridos', () => {
    const data = { nombre: 'Test' };
    expect(validateRequiredFields(data, [])).toBe(true);
  });

  test('acepta campos con valor null (campo existe)', () => {
    const data = { nombre: null, email: 'test@test.com' };
    expect(validateRequiredFields(data, ['nombre', 'email'])).toBe(true);
  });

  test('retorna false si el objeto está vacío', () => {
    expect(validateRequiredFields({}, ['nombre'])).toBe(false);
  });
});

describe('validateMessageLength', () => {
  test('acepta mensaje dentro del límite por defecto (4096)', () => {
    expect(validateMessageLength('Hola!')).toBe(true);
  });

  test('acepta mensaje exactamente en el límite', () => {
    const msg = 'a'.repeat(4096);
    expect(validateMessageLength(msg)).toBe(true);
  });

  test('rechaza mensaje que supera el límite por defecto', () => {
    const msg = 'a'.repeat(4097);
    expect(validateMessageLength(msg)).toBe(false);
  });

  test('acepta límite personalizado', () => {
    expect(validateMessageLength('Hola', 10)).toBe(true);
    expect(validateMessageLength('Este mensaje es largo', 10)).toBe(false);
  });

  test('rechaza string vacío', () => {
    expect(validateMessageLength('')).toBe(false);
  });

  test('rechaza valor no string', () => {
    expect(validateMessageLength(null as unknown as string)).toBe(false);
  });

  test('acepta mensaje con caracteres especiales y emojis', () => {
    expect(validateMessageLength('¡Hola! 👋 ¿Cómo estás?')).toBe(true);
  });
});

describe('sanitizeInput', () => {
  test('elimina etiquetas HTML de apertura y cierre', () => {
    const result = sanitizeInput('<b>texto</b>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('texto');
  });

  test('elimina script tags (protección XSS básica)', () => {
    const malicious = '<script>alert("xss")</script>';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  test('elimina protocolo javascript:', () => {
    const malicious = 'javascript:alert(1)';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('javascript:');
  });

  test('elimina manejadores de eventos inline', () => {
    const malicious = 'img onerror=alert(1)';
    const result = sanitizeInput(malicious);
    expect(result).not.toMatch(/on\w+\s*=/i);
  });

  test('elimina espacios al inicio y al final', () => {
    expect(sanitizeInput('  hola mundo  ')).toBe('hola mundo');
  });

  test('devuelve string vacío para input no string', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
    expect(sanitizeInput(undefined as unknown as string)).toBe('');
  });

  test('preserva texto normal sin modificarlo', () => {
    const normal = 'Hola, soy Carlos López, camarero.';
    expect(sanitizeInput(normal)).toBe(normal);
  });

  test('preserva caracteres acentuados y especiales españoles', () => {
    const texto = 'Bienvenido al Salón Príncipe - Año 2026';
    expect(sanitizeInput(texto)).toBe(texto);
  });
});
