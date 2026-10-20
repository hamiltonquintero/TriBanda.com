import { z } from 'zod';

export const crearGrupoSchema = z.object({
  fase_id: z.string().uuid('fase_id debe ser un UUID válido'),
  numero: z.number().int().min(1, 'El número de grupo debe ser >= 1'),
  letra: z.string().optional(),
});

export const asignarJugadoresSchema = z.object({
  jugador_ids: z.array(z.string().uuid()).min(1, 'Debe incluir al menos un jugador'),
});

export const sorteoSchema = z.object({
  fase_id: z.string().uuid('fase_id debe ser un UUID válido'),
  jugador_ids: z.array(z.string().uuid()).min(1, 'Debe incluir al menos un jugador'),
  clasificados_por_grupo: z.number().int().min(1).max(4).optional(),
});

export const reemplazarJugadorSchema = z.object({
  jugador_saliente_id: z.string().uuid('jugador_saliente_id debe ser UUID'),
  jugador_entrante_id: z.string().uuid('jugador_entrante_id debe ser UUID'),
});

export const agregarJugadorSchema = z.object({
  jugador_id: z.string().uuid('jugador_id debe ser UUID'),
});

