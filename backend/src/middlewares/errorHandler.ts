import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Log del error en servidor
  console.error(`[ERROR] ${new Date().toISOString()}:`, err instanceof Error ? err.message : err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: err.errors });
  }

  // Errores conocidos de la base de datos
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'No se puede completar la acción: existen datos relacionados' });
    return res.status(400).json({ error: `No se pudo completar la operación en la base de datos (código ${err.code})` });
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Datos inválidos para la operación solicitada' });
  }

  // Errores del parser de body (JSON inválido, payload muy grande)
  const httpErr = err as { status?: number; type?: string };
  if (httpErr?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON mal formado' });
  if (httpErr?.type === 'entity.too.large') return res.status(413).json({ error: 'El contenido enviado es demasiado grande' });

  if (err instanceof Error) {
    // Retornamos el mensaje real del error para que el cliente y el administrador sepan con claridad qué pasó
    const status = err.message.includes('no encontrad') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Error interno del servidor' });
}
