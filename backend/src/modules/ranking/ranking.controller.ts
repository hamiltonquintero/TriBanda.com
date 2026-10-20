import { Request, Response, NextFunction } from 'express';
import * as svc from './ranking.service';

export async function obtenerRankingTorneo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.obtenerRankingTorneo(req.params.torneo_id));
  } catch (err) { next(err); }
}

export async function obtenerRankingClub(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.obtenerRankingClub(req.params.torneo_id));
  } catch (err) { next(err); }
}

export async function recalcularRankingCompleto(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.recalcularRankingCompleto(req.params.torneo_id));
  } catch (err) { next(err); }
}

export async function obtenerEstadisticasJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const { torneo_id } = req.query as { torneo_id?: string };
    res.json(await svc.obtenerEstadisticasJugador(req.params.jugador_id, torneo_id));
  } catch (err) { next(err); }
}

export async function asignarPuntosPosicionFinal(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.asignarPuntosPosicionFinal(req.params.torneo_id));
  } catch (err) { next(err); }
}
