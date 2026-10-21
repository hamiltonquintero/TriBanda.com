import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Log del error en servidor
  console.error(`[ERROR] ${new Date().toISOString()}:`, err instanceof Error ? err.message : err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: err.errors });
  }

  if (err instanceof Error) {
    // Retornamos el mensaje real del error para que el cliente y el administrador sepan con claridad qué pasó
    const status = err.message.includes('no encontrad') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Error interno del servidor' });
}
