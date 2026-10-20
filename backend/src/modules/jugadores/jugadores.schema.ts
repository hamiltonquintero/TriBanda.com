import { z } from 'zod';

export const crearJugadorSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  apellido: z.string().min(2, 'Apellido requerido'),
  alias: z.string().optional(),
  cedula: z.string().optional(),
  celular: z.string().optional(),
  ciudad: z.string().optional(),
  pais: z.string().optional().default('Colombia'),
  club_ciudad: z.string().min(1, 'Club o ciudad requerido'),
  categoria: z.string().optional(),
  foto_url: z.string().optional().or(z.literal('')),
  club_id: z.string().uuid().optional(),
});

export const itemJugadorMasivoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().optional().default(''),
  alias: z.string().optional(),
  cedula: z.string().optional(),
  celular: z.string().optional(),
  ciudad: z.string().optional(),
  pais: z.string().optional().default('Colombia'),
  club_ciudad: z.string().optional().default('Club Billar'),
  categoria: z.string().optional(),
  promedio_historico: z.number().optional().default(0),
  foto_url: z.string().optional().or(z.literal('')),
  club_id: z.string().optional(),
});

export const importarJugadoresMasivoSchema = z.object({
  jugadores: z.array(itemJugadorMasivoSchema).min(1, 'Debe incluir al menos un jugador'),
});

export const editarJugadorSchema = crearJugadorSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const crearClubSchema = z.object({
  nombre: z.string().min(2, 'Nombre del club requerido'),
  ciudad: z.string().optional(),
});

