import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Log del error en servidor
  console.error(`[ERROR] ${new Date().toISOString()}:`, err instanceof Error ? err.message : err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: err.errors });
  }

  if (err instanceof Error) {
    // En producción, no exponer detalles internos
    const isDev = process.env.NODE_ENV !== 'production';
    const mensaje = isDev ? err.message : 'Error interno del servidor';

    // Errores conocidos de negocio (los que lanzamos con throw new Error)
    if (err.message.includes('no encontrad') ||
        err.message.includes('ya existe') ||
        err.message.includes('ya está') ||
        err.message.includes('no puede') ||
        err.message.includes('Solo se puede') ||
        err.message.includes('Mínimo') ||
        err.message.includes('Máximo') ||
        err.message.includes('inválid') ||
        err.message.includes('incorrec') ||
        err.message.includes('ya fue') ||
        err.message.includes('no está')) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: mensaje });
  }

  return res.status(500).json({ error: 'Error interno del servidor' });
}
