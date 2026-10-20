import { Request, Response, NextFunction } from 'express';
import * as svc from './jugadores.service';
import { crearJugadorSchema, editarJugadorSchema, crearClubSchema, importarJugadoresMasivoSchema } from './jugadores.schema';

// ─── CLUBES ──────────────────────────────────────────────────────────────────

export async function listarClubes(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.listarClubes()); } catch (err) { next(err); }
}

export async function crearClub(req: Request, res: Response, next: NextFunction) {
  try {
    const data = crearClubSchema.parse(req.body);
    res.status(201).json(await svc.crearClub(data));
  } catch (err) { next(err); }
}

// ─── JUGADORES ───────────────────────────────────────────────────────────────

export async function listarJugadores(req: Request, res: Response, next: NextFunction) {
  try {
    const { club_id, activo, buscar } = req.query;
    res.json(await svc.listarJugadores({
      club_id: club_id as string | undefined,
      activo: activo !== undefined ? activo === 'true' : undefined,
      buscar: buscar as string | undefined,
    }));
  } catch (err) { next(err); }
}

export async function obtenerJugador(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerJugador(req.params.id)); } catch (err) { next(err); }
}

export async function crearJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const data = crearJugadorSchema.parse(req.body);
    res.status(201).json(await svc.crearJugador(data));
  } catch (err) { next(err); }
}

export async function importarJugadoresMasivo(req: Request, res: Response, next: NextFunction) {
  try {
    const { jugadores } = importarJugadoresMasivoSchema.parse(req.body);
    const resultado = await svc.importarJugadoresMasivo(jugadores);
    res.status(200).json(resultado);
  } catch (err) { next(err); }
}

export async function editarJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const data = editarJugadorSchema.parse(req.body);
    res.json(await svc.editarJugador(req.params.id, data));
  } catch (err) { next(err); }
}

export async function desactivarJugador(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.desactivarJugador(req.params.id)); } catch (err) { next(err); }
}
