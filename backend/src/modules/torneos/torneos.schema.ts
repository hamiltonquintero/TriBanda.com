import { z } from 'zod';

const torneoBase = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  descripcion: z.string().optional(),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha de fin requerida'),
  sede: z.string().min(2, 'Sede requerida'),
  incremento: z.coerce.number().min(0).max(10).default(0),
  meta_base: z.coerce.number().int().min(5).max(60).default(30),
  modalidad: z.enum(['profesional', 'local', 'relampago']).default('local'),
  distancia_relampago: z.enum(['corto', 'largo']).nullable().optional(),
  limite_entradas: z.coerce.number().int().min(5).max(100).nullable().optional(),
  modo_libre: z.boolean().default(false),
  total_sets_default: z.coerce.number().int().min(1).max(5).default(1),
});

export const crearTorneoSchema = torneoBase.refine(
  (d) => new Date(d.fecha_fin) > new Date(d.fecha_inicio),
  { message: 'La fecha de fin debe ser posterior a la fecha de inicio', path: ['fecha_fin'] }
);

export const editarTorneoSchema = torneoBase.partial();

export const crearFaseSchema = z.object({
  tipo: z.enum(['grupos', 'clasificatorio', 'llaves', 'final']),
  fecha: z.string().min(1, 'Fecha requerida'),
  orden: z.number().int().min(1),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(['borrador', 'activo', 'finalizado']),
});
