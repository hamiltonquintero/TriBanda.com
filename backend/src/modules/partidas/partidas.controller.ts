import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/authGuard';
import * as svc from './partidas.service';
import { crearPartidaSchema, registrarEntradaSchema, marcadorSchema, cambioTurnoSchema } from './partidas.schema';

export async function listarPartidas(req: Request, res: Response, next: NextFunction) {
  try {
    const { fase_id, estado, jugador_id } = req.query as Record<string, string>;
    res.json(await svc.listarPartidas(req.params.torneo_id, { fase_id, estado, jugador_id }));
  } catch (err) { next(err); }
}

export async function obtenerPartida(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerPartida(req.params.id)); } catch (err) { next(err); }
}

export async function obtenerPlanilla(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerPlanilla(req.params.id)); } catch (err) { next(err); }
}

export async function obtenerMarcador(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.obtenerMarcador(req.params.id)); } catch (err) { next(err); }
}

export async function crearPartida(req: Request, res: Response, next: NextFunction) {
  try {
    const data = crearPartidaSchema.parse(req.body);
    res.status(201).json(await svc.crearPartida({
      ...data,
      grupo_id: data.grupo_id || undefined,
      juez_id: data.juez_id || undefined,
      fecha: data.fecha || undefined,
      hora: data.hora || undefined,
    }));
  } catch (err) { next(err); }
}

export async function iniciarPartida(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = req.body && Object.keys(req.body).length > 0 ? req.body : undefined;
    const juez_id = req.user?.rol === 'juez' ? req.user.id : undefined;
    res.json(await svc.iniciarPartida(req.params.id, data, juez_id));
  } catch (err) { next(err); }
}

export async function registrarEntrada(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registrarEntradaSchema.parse(req.body);
    res.json(await svc.registrarEntrada(req.params.id, data));
  } catch (err) { next(err); }
}

export async function marcadorAccion(req: Request, res: Response, next: NextFunction) {
  try {
    const data = marcadorSchema.parse(req.body);
    res.json(await svc.marcadorAccion(req.params.id, data));
  } catch (err) { next(err); }
}

export async function cambioTurno(req: Request, res: Response, next: NextFunction) {
  try {
    const data = cambioTurnoSchema.parse(req.body);
    res.json(await svc.cambioTurno(req.params.id, data.set_numero));
  } catch (err) { next(err); }
}

export async function finalizarSet(req: Request, res: Response, next: NextFunction) {
  try {
    const set_numero = parseInt(req.params.set_numero);
    res.json(await svc.finalizarSet(req.params.id, set_numero));
  } catch (err) { next(err); }
}

export async function confirmarPartida(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    res.json(await svc.confirmarPartida(req.params.id, req.user.id, req.user.rol));
  } catch (err) { next(err); }
}

export async function historialJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const { torneo_id } = req.query as { torneo_id?: string };
    res.json(await svc.historialJugador(req.params.jugador_id, torneo_id));
  } catch (err) { next(err); }
}

export async function solicitarCorreccion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const { motivo } = req.body as { motivo?: string };
    if (!motivo) return res.status(400).json({ error: 'Debe especificar el motivo de la corrección' });
    res.json(await svc.solicitarCorreccion(req.params.id, req.user.id, motivo));
  } catch (err) { next(err); }
}

export async function reabrirPartida(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const { motivo } = req.body as { motivo?: string };
    res.json(await svc.reabrirPartida(req.params.id, req.user.id, motivo));
  } catch (err) { next(err); }
}

export async function rechazarCorreccion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const { motivo } = req.body as { motivo?: string };
    res.json(await svc.rechazarCorreccion(req.params.id, req.user.id, motivo));
  } catch (err) { next(err); }
}

export async function listarSolicitudesCorreccion(req: Request, res: Response, next: NextFunction) {
  try {
    const { torneo_id } = req.query as { torneo_id?: string };
    res.json(await svc.listarSolicitudesCorreccion(torneo_id));
  } catch (err) { next(err); }
}

export async function asignarJuez(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { juez_id } = req.body as { juez_id?: string | null };
    res.json(await svc.asignarJuez(req.params.id, juez_id));
  } catch (err) { next(err); }
}
