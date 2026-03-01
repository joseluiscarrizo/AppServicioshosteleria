import { z } from 'zod';

const telefonoSchema = z.string().regex(/^\d{10}$/);

export const ClienteSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email().optional(),
  telefono: telefonoSchema.optional(),
  codigo: z.string().min(2).max(20)
});

export const CamareroSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  telefono: telefonoSchema,
  codigo: z.string().min(2).max(20)
});
