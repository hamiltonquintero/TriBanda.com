import prisma from '../../config/prisma';

// ─── HELPERS: Calcular nivel y meta según promedio histórico ─────────────────

export function calcularNivelYMeta(promedio_historico: number): { nivel: string; meta_puntos: number } {
  // Primera categoría: promedio >= 0.800 → meta 28
  // Segunda categoría: promedio >= 0.500 → meta 24
  // Tercera categoría: promedio < 0.500 → meta 20
  if (promedio_historico >= 0.800) return { nivel: 'primera', meta_puntos: 28 };
  if (promedio_historico >= 0.500) return { nivel: 'segunda', meta_puntos: 24 };
  return { nivel: 'tercera', meta_puntos: 20 };
}

// ─── LISTAR PARTICIPANTES DE UN TORNEO ───────────────────────────────────────

export async function listarParticipantes(torneo_id: string) {
  return prisma.inscripcionTorneo.findMany({
    where: { torneo_id },
    include: { jugador: { include: { club: true } } },
    orderBy: { created_at: 'asc' },
  });
}

// ─── INSCRIBIR JUGADOR ───────────────────────────────────────────────────────

export async function inscribirJugador(torneo_id: string, jugador_id: string, meta_manual?: number) {
  const jugador = await prisma.jugador.findUnique({ where: { id: jugador_id } });
  if (!jugador) throw new Error('Jugador no encontrado');
  if (!jugador.activo) throw new Error('El jugador está inactivo');

  const yaInscrito = await prisma.inscripcionTorneo.findUnique({
    where: { torneo_id_jugador_id: { torneo_id, jugador_id } },
  });
  if (yaInscrito) throw new Error('El jugador ya está inscrito en este torneo');

  // Calcular nivel automáticamente desde promedio histórico
  const { nivel, meta_puntos } = calcularNivelYMeta(jugador.promedio_historico);

  return prisma.inscripcionTorneo.create({
    data: {
      torneo_id,
      jugador_id,
      nivel,
      meta_puntos: meta_manual ?? meta_puntos,
    },
    include: { jugador: { include: { club: true } } },
  });
}

// ─── ACTUALIZAR META MANUAL ──────────────────────────────────────────────────

export async function actualizarMeta(id: string, data: { nivel?: string; meta_puntos?: number; pago_confirmado?: boolean }) {
  return prisma.inscripcionTorneo.update({
    where: { id },
    data,
    include: { jugador: { include: { club: true } } },
  });
}


// ─── REMOVER JUGADOR ─────────────────────────────────────────────────────────

export async function removerParticipante(torneo_id: string, jugador_id: string) {
  return prisma.inscripcionTorneo.delete({
    where: { torneo_id_jugador_id: { torneo_id, jugador_id } },
  });
}

// ─── SORTEO INTELIGENTE ──────────────────────────────────────────────────────
// Crea grupos automáticamente, maneja sobrantes

export async function sorteoConGrupos(
  fase_id: string,
  jugador_ids: string[],
  tamano_grupo: 3 | 4
) {
  const total = jugador_ids.length;
  if (total < 3) throw new Error('Se necesitan al menos 3 jugadores para el sorteo');

  const numGrupos = Math.floor(total / tamano_grupo);
  const sobrantes = total % tamano_grupo;

  if (numGrupos === 0) throw new Error(`No se pueden crear grupos de ${tamano_grupo} con ${total} jugadores`);

  // Mezclar aleatoriamente (Fisher-Yates)
  const mezclados = [...jugador_ids];
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
  }

  // Eliminar grupos existentes de la fase
  await prisma.grupoJugador.deleteMany({ where: { grupo: { fase_id } } });
  await prisma.grupo.deleteMany({ where: { fase_id } });

  // Crear grupos
  const grupos = [];
  for (let i = 0; i < numGrupos; i++) {
    const letra = String.fromCharCode(65 + i); // A, B, C...
    const g = await prisma.grupo.create({
      data: { fase_id, numero: i + 1, letra },
    });
    grupos.push(g);
  }

  // Distribuir jugadores en grupos
  const asignaciones: Record<string, string[]> = {};
  grupos.forEach((g) => { asignaciones[g.id] = []; });

  let idx = 0;
  for (const g of grupos) {
    for (let j = 0; j < tamano_grupo && idx < mezclados.length; j++) {
      asignaciones[g.id].push(mezclados[idx]);
      idx++;
    }
  }

  // Sobrantes: distribuir aleatoriamente en grupos existentes
  while (idx < mezclados.length) {
    const grupoAleatorio = grupos[Math.floor(Math.random() * grupos.length)];
    asignaciones[grupoAleatorio.id].push(mezclados[idx]);
    idx++;
  }

  // Insertar asignaciones
  await prisma.grupoJugador.createMany({
    data: Object.entries(asignaciones).flatMap(([grupo_id, jids]) =>
      jids.map((jugador_id) => ({ grupo_id, jugador_id }))
    ),
  });

  // Retornar grupos con jugadores
  return prisma.grupo.findMany({
    where: { fase_id },
    include: { jugadores: { include: { jugador: { include: { club: true } } } } },
    orderBy: { numero: 'asc' },
  });
}
