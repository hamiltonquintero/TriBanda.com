import prisma from '../../config/prisma';
import { obtenerRankingTorneo, asignarPuntosPosicionFinal } from '../ranking/ranking.service';
import { obtenerBracket } from '../bracket/bracket.service';
import { listarGrupos } from '../grupos/grupos.service';

export async function listarTorneos() {
  return prisma.torneo.findMany({
    include: { fases: { orderBy: { orden: 'asc' } } },
    orderBy: { fecha_inicio: 'desc' },
  });
}

export async function obtenerTorneo(id: string) {
  const torneo = await prisma.torneo.findUnique({
    where: { id },
    include: {
      fases: {
        orderBy: { orden: 'asc' },
        include: {
          grupos: { include: { jugadores: { include: { jugador: true } } } },
        },
      },
    },
  });
  if (!torneo) throw new Error('Torneo no encontrado');
  return torneo;
}

export async function crearTorneo(data: {
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  sede: string;
  incremento: number;
  meta_base?: number;
  modalidad?: string;
  distancia_relampago?: string | null;
  limite_entradas?: number | null;
  modo_libre?: boolean;
  total_sets_default?: number;
}) {
  const setsDefault = data.modalidad === 'profesional' ? (data.total_sets_default ?? 3) : 1;
  return prisma.torneo.create({
    data: {
      ...data,
      total_sets_default: setsDefault,
      fecha_inicio: new Date(data.fecha_inicio),
      fecha_fin: new Date(data.fecha_fin),
    },
  });
}

export async function editarTorneo(id: string, data: Partial<{
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  sede: string;
  incremento: number;
  meta_base: number;
  modalidad: string;
  distancia_relampago: string | null;
  limite_entradas: number | null;
  modo_libre: boolean;
  total_sets_default: number;
}>) {
  const torneo = await prisma.torneo.findUnique({ where: { id } });
  if (!torneo) throw new Error('Torneo no encontrado');
  if (torneo.estado !== 'borrador') throw new Error('Solo se puede editar un torneo en estado borrador');

  return prisma.torneo.update({
    where: { id },
    data: {
      ...data,
      ...(data.fecha_inicio && { fecha_inicio: new Date(data.fecha_inicio) }),
      ...(data.fecha_fin && { fecha_fin: new Date(data.fecha_fin) }),
    },
  });
}

export async function cambiarEstado(id: string, estado: 'borrador' | 'activo' | 'finalizado') {
  const torneo = await prisma.torneo.update({ where: { id }, data: { estado } });

  // Al finalizar el torneo, asignar puntos por posición final automáticamente
  if (estado === 'finalizado') {
    try {
      await asignarPuntosPosicionFinal(id);
    } catch {
      // Si falla la asignación de puntos, el torneo ya se finalizó
    }
  }

  return torneo;
}

// ─── FASES ───────────────────────────────────────────────────────────────────

export async function crearFase(torneo_id: string, data: {
  tipo: 'grupos' | 'clasificatorio' | 'llaves' | 'final';
  fecha: string;
  orden: number;
}) {
  const torneo = await prisma.torneo.findUnique({ where: { id: torneo_id } });
  if (!torneo) throw new Error('Torneo no encontrado');
  if (torneo.estado !== 'borrador') throw new Error('No se pueden agregar fases a un torneo activo o finalizado');

  return prisma.fase.create({
    data: { ...data, fecha: new Date(data.fecha), torneo_id },
  });
}

export async function listarFases(torneo_id: string) {
  return prisma.fase.findMany({
    where: { torneo_id },
    orderBy: { orden: 'asc' },
  });
}

export async function eliminarFase(id: string) {
  return prisma.fase.delete({ where: { id } });
}

export async function obtenerRankingPublico(torneoId: string) {
  return obtenerRankingTorneo(torneoId);
}

export async function obtenerBracketPublico(torneoId: string) {
  const faseLlaves = await prisma.fase.findFirst({
    where: { torneo_id: torneoId, tipo: { in: ['llaves', 'final'] } },
    orderBy: { orden: 'asc' },
  });
  if (!faseLlaves) return { torneo_id: torneoId, rondas: [], campeon: null };
  return obtenerBracket(faseLlaves.id);
}

export async function obtenerGruposPublicos(torneoId: string) {
  const fasesGrupos = await prisma.fase.findMany({
    where: { torneo_id: torneoId, tipo: 'grupos' },
    orderBy: { orden: 'asc' },
  });

  const fases = await Promise.all(
    fasesGrupos.map(async (fase) => ({
      fase_id: fase.id,
      fase_orden: fase.orden,
      grupos: await listarGrupos(fase.id),
    }))
  );
  return { torneo_id: torneoId, fases };
}
