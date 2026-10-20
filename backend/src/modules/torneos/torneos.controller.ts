import { Request, Response, NextFunction } from 'express';
import * as svc from './torneos.service';
import { crearTorneoSchema, editarTorneoSchema, crearFaseSchema, cambiarEstadoSchema } from './torneos.schema';

export async function listarTorneos(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.listarTorneos()); } catch (err) { next(err); }
}

export async function obtenerTorneo(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerTorneo(req.params.id)); } catch (err) { next(err); }
}

export async function crearTorneo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = crearTorneoSchema.parse(req.body);
    res.status(201).json(await svc.crearTorneo(data));
  } catch (err) { next(err); }
}

export async function editarTorneo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = editarTorneoSchema.parse(req.body);
    res.json(await svc.editarTorneo(req.params.id, data));
  } catch (err) { next(err); }
}

export async function cambiarEstado(req: Request, res: Response, next: NextFunction) {
  try {
    const { estado } = cambiarEstadoSchema.parse(req.body);
    res.json(await svc.cambiarEstado(req.params.id, estado));
  } catch (err) { next(err); }
}

// ─── FASES ───────────────────────────────────────────────────────────────────

export async function listarFases(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.listarFases(req.params.id)); } catch (err) { next(err); }
}

export async function crearFase(req: Request, res: Response, next: NextFunction) {
  try {
    const data = crearFaseSchema.parse(req.body);
    res.status(201).json(await svc.crearFase(req.params.id, data));
  } catch (err) { next(err); }
}

export async function eliminarFase(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.eliminarFase(req.params.faseId);
    res.json({ mensaje: 'Fase eliminada' });
  } catch (err) { next(err); }
}

export async function obtenerRankingPublico(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerRankingPublico(req.params.id)); } catch (err) { next(err); }
}

export async function obtenerBracketPublico(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerBracketPublico(req.params.id)); } catch (err) { next(err); }
}

export async function obtenerGruposPublicos(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerGruposPublicos(req.params.id)); } catch (err) { next(err); }
}
