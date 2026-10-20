import { Request, Response, NextFunction } from 'express';
import * as svc from './inscripciones.service';
import { z } from 'zod';

const inscribirSchema = z.object({
  jugador_id: z.string().uuid(),
  meta_manual: z.number().int().min(1).optional(),
});

const actualizarMetaSchema = z.object({
  nivel: z.enum(['primera', 'segunda', 'tercera']).optional(),
  meta_puntos: z.number().int().min(1).optional(),
  pago_confirmado: z.boolean().optional(),
});


const sorteoSchema = z.object({
  fase_id: z.string().uuid(),
  jugador_ids: z.array(z.string().uuid()).min(3),
  tamano_grupo: z.union([z.literal(3), z.literal(4)]),
});

export async function listarParticipantes(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.listarParticipantes(req.params.torneo_id)); } catch (err) { next(err); }
}

export async function inscribirJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const data = inscribirSchema.parse(req.body);
    res.status(201).json(await svc.inscribirJugador(req.params.torneo_id, data.jugador_id, data.meta_manual));
  } catch (err) { next(err); }
}

export async function actualizarMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const data = actualizarMetaSchema.parse(req.body);
    res.json(await svc.actualizarMeta(req.params.id, data));
  } catch (err) { next(err); }
}

export async function removerParticipante(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.removerParticipante(req.params.torneo_id, req.params.jugador_id);
    res.json({ mensaje: 'Jugador removido del torneo' });
  } catch (err) { next(err); }
}

export async function sorteoConGrupos(req: Request, res: Response, next: NextFunction) {
  try {
    const data = sorteoSchema.parse(req.body);
    res.json(await svc.sorteoConGrupos(data.fase_id, data.jugador_ids, data.tamano_grupo));
  } catch (err) { next(err); }
}
