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
  foto_url: z.string().url('URL de foto inválida').optional().or(z.literal('')),
  club_id: z.string().uuid().optional(),
});

export const editarJugadorSchema = crearJugadorSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const crearClubSchema = z.object({
  nombre: z.string().min(2, 'Nombre del club requerido'),
  ciudad: z.string().optional(),
});
