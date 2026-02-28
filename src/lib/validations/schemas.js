import { z } from 'zod';

/**
 * Zod validation schemas for the application forms.
 * Centralizes input validation logic to prevent XSS and ensure data integrity.
 */

// Common reusable fields
const emailField = z
  .string()
  .email('El email no es válido')
  .max(254, 'El email es demasiado largo')
  .optional()
  .or(z.literal(''));

const phoneField = z
  .string()
  .regex(/^(\+\d{1,3}[- ]?)?\d{7,15}$/, 'El teléfono no es válido')
  .optional()
  .or(z.literal(''));

const requiredString = (fieldName) =>
  z.string().min(1, `${fieldName} es obligatorio`).max(500, `${fieldName} es demasiado largo`);

// ─── Camarero / Staff Schema ──────────────────────────────────────────────────
export const camareroSchema = z.object({
  nombre: requiredString('El nombre'),
  email: emailField,
  telefono: phoneField,
  especialidad: z.enum(['general', 'cocteleria', 'banquetes', 'eventos_vip', 'buffet']).default('general'),
  nivel_experiencia: z.enum(['junior', 'intermedio', 'senior', 'experto']).default('intermedio'),
  experiencia_anios: z.number().min(0).max(60).optional(),
  disponible: z.boolean().default(true),
  en_reserva: z.boolean().default(false),
  notas: z.string().max(2000, 'Las notas son demasiado largas').optional().or(z.literal('')),
  habilidades: z.array(z.string()).optional().default([]),
  idiomas: z.array(z.string()).optional().default([]),
  certificaciones: z.array(z.string()).optional().default([]),
});

// ─── Pedido / Order Schema ────────────────────────────────────────────────────
export const pedidoSchema = z.object({
  cliente: requiredString('El cliente'),
  cliente_id: z.string().optional().or(z.literal('')),
  lugar_evento: requiredString('El lugar del evento'),
  dia: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .min(1, 'La fecha es obligatoria'),
  cliente_email_1: emailField,
  cliente_email_2: emailField,
  cliente_telefono_1: phoneField,
  cliente_telefono_2: phoneField,
  cliente_persona_contacto_1: z.string().max(200).optional().or(z.literal('')),
  cliente_persona_contacto_2: z.string().max(200).optional().or(z.literal('')),
  notas: z.string().max(5000).optional().or(z.literal('')),
  camisa: z.string().max(100).optional().or(z.literal('')),
  extra_transporte: z.boolean().default(false),
});

// ─── Cliente Schema ───────────────────────────────────────────────────────────
export const clienteSchema = z.object({
  nombre: requiredString('El nombre'),
  email: emailField,
  telefono: phoneField,
  contacto: z.string().max(200).optional().or(z.literal('')),
  notas: z.string().max(5000).optional().or(z.literal('')),
  direccion: z.string().max(500).optional().or(z.literal('')),
});

// ─── Coordinador Schema ───────────────────────────────────────────────────────
export const coordinadorSchema = z.object({
  nombre: requiredString('El nombre'),
  email: emailField,
  telefono: phoneField,
  notas: z.string().max(2000).optional().or(z.literal('')),
});

// ─── Chat Message Schema ──────────────────────────────────────────────────────
export const mensajeChatSchema = z.object({
  contenido: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(5000, 'El mensaje es demasiado largo'),
  grupo_id: z.string().min(1, 'El grupo es obligatorio'),
});

// ─── QR Fichaje Token Schema ──────────────────────────────────────────────────
export const fichajeTokenSchema = z.object({
  token: z
    .string()
    .min(1, 'El token no puede estar vacío')
    .max(1000, 'El token es inválido'),
});

/**
 * Validates data against a schema and returns a result object.
 * @param {z.ZodSchema} schema - Zod schema to validate against.
 * @param {unknown} data - Data to validate.
 * @returns {{ success: boolean, data?: unknown, errors?: Record<string, string> }}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}
