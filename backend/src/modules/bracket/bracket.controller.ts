import { NextFunction, Request, Response } from 'express';
import * as svc from './bracket.service';
import prisma from '../../config/prisma';
import { obtenerClasificados as listarClasificadosGrupos } from '../grupos/grupos.service';

export async function obtenerBracket(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.obtenerBracket(req.params.fase_id));
  } catch (err) {
    next(err);
  }
}

export async function generarBracket(req: Request, res: Response, next: NextFunction) {
  try {
    const faseId = req.params.fase_id;
    const body = req.body as { jugador_ids?: string[]; tamano_bracket?: number };
    let jugadorIds = body.jugador_ids ?? [];
    const tamanoManual = body.tamano_bracket;

    if (jugadorIds.length === 0) {
      const fase = await prisma.fase.findUnique({ where: { id: faseId } });
      if (!fase) throw new Error('Fase no encontrada');
      const faseGrupos = await prisma.fase.findFirst({
        where: { torneo_id: fase.torneo_id, tipo: 'grupos' },
        orderBy: { orden: 'asc' },
      });
      if (!faseGrupos) throw new Error('No hay fase de grupos en este torneo');
      const infoClasificados = await listarClasificadosGrupos(faseGrupos.id);
      jugadorIds = infoClasificados.tabla_general.map((c) => c.jugador_id);
    }

    res.status(201).json(await svc.generarBracket(faseId, jugadorIds, tamanoManual));
  } catch (err) {
    next(err);
  }
}

export async function avanzarGanador(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.avanzarGanador(req.params.partida_id);
    res.json({ mensaje: 'Ganador avanzado en bracket' });
  } catch (err) {
    next(err);
  }
}

export async function obtenerClasificados(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.obtenerClasificadosBracket(req.params.fase_id));
  } catch (err) {
    next(err);
  }
}
