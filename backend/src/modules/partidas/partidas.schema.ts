import { z } from 'zod';

export const crearPartidaSchema = z.object({
  fase_id: z.string().uuid('fase_id debe ser un UUID válido'),
  grupo_id: z.string().uuid().optional().or(z.literal('')),
  jugador_a_id: z.string().uuid('jugador_a_id debe ser un UUID válido'),
  jugador_b_id: z.string().uuid('jugador_b_id debe ser un UUID válido'),
  juez_id: z.string().uuid().optional().or(z.literal('')),
  fecha: z.string().optional().or(z.literal('')),
  hora: z.string().optional().or(z.literal('')),
  total_sets: z.coerce.number().int().min(1).max(5).default(3),
  meta_a: z.coerce.number().int().min(1).optional(),
  meta_b: z.coerce.number().int().min(1).optional(),
}).refine((d) => d.jugador_a_id !== d.jugador_b_id, {
  message: 'Jugador A y Jugador B no pueden ser el mismo',
  path: ['jugador_b_id'],
});

export const iniciarPartidaSchema = z.object({
  jugador_salida_id: z.string().uuid().optional().or(z.literal('')),
  color_bola_a: z.string().optional(),
  color_bola_b: z.string().optional(),
  meta_a: z.coerce.number().int().min(1).optional(),
  meta_b: z.coerce.number().int().min(1).optional(),
  limite_entradas: z.coerce.number().int().min(5).max(100).nullable().optional(),
  modo_libre: z.boolean().optional(),
  juez_id: z.string().optional().nullable().or(z.literal('')),
  juez_nombre: z.string().optional().nullable(),
}).optional();

export const registrarEntradaSchema = z.object({
  set_numero: z.number().int().min(1).max(5),
  numero_entrada: z.number().int().min(1).max(100),
  carambolas_a: z.number().int().min(0),
  carambolas_b: z.number().int().min(0),
});

// Marcador digital: sumar/restar carambola individual
export const marcadorSchema = z.object({
  jugador_id: z.string().uuid(),
  accion: z.enum(['sumar', 'restar']),
  set_numero: z.number().int().min(1).max(5),
});

// Cambio de turno (nueva entrada)
export const cambioTurnoSchema = z.object({
  set_numero: z.number().int().min(1).max(5),
});

export const confirmarSchema = z.object({});
