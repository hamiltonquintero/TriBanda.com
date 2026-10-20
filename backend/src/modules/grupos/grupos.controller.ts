import { Request, Response, NextFunction } from 'express';
import * as svc from './grupos.service';
import {
  crearGrupoSchema,
  asignarJugadoresSchema,
  sorteoSchema,
  reemplazarJugadorSchema,
  agregarJugadorSchema,
} from './grupos.schema';

export async function listarGrupos(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listarGrupos(req.params.fase_id));
  } catch (err) { next(err); }
}

export async function obtenerGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.obtenerGrupo(req.params.id));
  } catch (err) { next(err); }
}

export async function crearGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = crearGrupoSchema.parse(req.body);
    res.status(201).json(await svc.crearGrupo(data));
  } catch (err) { next(err); }
}

export async function eliminarGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.eliminarGrupo(req.params.id);
    res.json({ mensaje: 'Grupo eliminado correctamente' });
  } catch (err) { next(err); }
}

export async function asignarJugadores(req: Request, res: Response, next: NextFunction) {
  try {
    const { jugador_ids } = asignarJugadoresSchema.parse(req.body);
    res.json(await svc.asignarJugadores(req.params.id, jugador_ids));
  } catch (err) { next(err); }
}

export async function reemplazarJugador(req: Request, res: Response, next: NextFunction) {
  try {
    const { jugador_saliente_id, jugador_entrante_id } = reemplazarJugadorSchema.parse(req.body);
    res.json(await svc.reemplazarJugador(req.params.id, jugador_saliente_id, jugador_entrante_id));
  } catch (err) { next(err); }
}

export async function eliminarJugadorDeGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.eliminarJugadorDeGrupo(req.params.id, req.params.jugador_id));
  } catch (err) { next(err); }
}

export async function agregarJugadorAGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    const { jugador_id } = agregarJugadorSchema.parse(req.body);
    res.json(await svc.agregarJugadorAGrupo(req.params.id, jugador_id));
  } catch (err) { next(err); }
}

export async function generarPartidasGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.generarPartidasGrupo(req.params.id));
  } catch (err) { next(err); }
}

export async function sorteoAutomatico(req: Request, res: Response, next: NextFunction) {
  try {
    const { jugador_ids, clasificados_por_grupo } = sorteoSchema.parse(req.body);
    res.json(await svc.sorteoAutomatico(req.params.fase_id, jugador_ids, clasificados_por_grupo));
  } catch (err) { next(err); }
}

export async function obtenerClasificados(req: Request, res: Response, next: NextFunction) {
  try {
    const override = req.query.clasificados_por_grupo ? Number(req.query.clasificados_por_grupo) : undefined;
    res.json(await svc.obtenerClasificados(req.params.fase_id, override));
  } catch (err) { next(err); }
}

export async function calcularTablaGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.calcularTablaGrupo(req.params.id));
  } catch (err) { next(err); }
}

export async function generarPartidasFase(req: Request, res: Response, next: NextFunction) {
  try {
    const faseId = req.params.fase_id || req.params.id;
    res.json(await svc.generarPartidasFase(faseId));
  } catch (err) { next(err); }
}

export async function generarPartidasAuto(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id || req.params.fase_id;
    // Intentar como grupo primero
    try {
      const resGrupo = await svc.generarPartidasGrupo(id);
      return res.json(resGrupo);
    } catch (eGrupo: any) {
      // Si no es grupo o falla con 'Grupo no encontrado', intentar como fase
      if (eGrupo?.message?.includes('Grupo no encontrado')) {
        const resFase = await svc.generarPartidasFase(id);
        return res.json(resFase);
      }
      throw eGrupo;
    }
  } catch (err) { next(err); }
}

export async function autoAsignarJuecesFase(req: Request, res: Response, next: NextFunction) {
  try {
    const faseId = req.params.fase_id || req.params.id;
    res.json(await svc.autoAsignarJuecesFase(faseId));
  } catch (err) { next(err); }
}

