import prisma from '../../config/prisma';

// ─── PUNTOS BASE POR POSICIÓN (Exacto al Excel) ──────────────────────────────
export function puntosBasePorPosicion(pos: number): number {
  if (pos === 1) return 90;
  if (pos === 2) return 48;
  if (pos === 3) return 30;
  if (pos === 4) return 24;
  if (pos >= 5 && pos <= 8) return 12;
  if (pos >= 9 && pos <= 16) return 6;
  if (pos >= 17 && pos <= 18) return 4;
  if (pos >= 19 && pos <= 27) return 3;
  return 2;
}

// ─── OBTENER RANKING TORNEO ───────────────────────────────────────────────────

export async function obtenerRankingTorneo(torneo_id: string) {
  const torneo = await prisma.torneo.findUnique({ where: { id: torneo_id } });
  if (!torneo) throw new Error('Torneo no encontrado');

  const rankings = await prisma.ranking.findMany({
    where: { torneo_id },
    include: {
      jugador: { include: { club: true } },
    },
  });

  const factor = 1 + torneo.incremento;

  const calculados = rankings.map((r) => {
    // Si ya tiene puntos_ranking calculados por posición final (> 0), usar esos
    // Si no, estimar según puntos de partida y factor
    const ptsR = r.puntos_ranking > 0
      ? r.puntos_ranking
      : Math.round(r.puntos * factor * 100) / 100;

    return {
      ...r,
      puntos_ranking: ptsR,
    };
  });

  // Orden oficial UMB / Fecolbi:
  // 1° Puntos DESC
  // 2° Promedio General DESC
  // 3° Promedio Particular DESC
  // 4° Mayor Serie DESC
  // 5° Carambolas totales DESC
  // 6° Entradas totales ASC
  calculados.sort((a, b) => {
    if (a.posicion > 0 && b.posicion > 0 && a.posicion !== b.posicion) {
      return a.posicion - b.posicion;
    }
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.promedio !== a.promedio) return b.promedio - a.promedio;
    if (b.promedio_particular !== a.promedio_particular) return b.promedio_particular - a.promedio_particular;
    if (b.mayor_serie !== a.mayor_serie) return b.mayor_serie - a.mayor_serie;
    if (b.carambolas_total !== a.carambolas_total) return b.carambolas_total - a.carambolas_total;
    return a.entradas_total - b.entradas_total;
  });

  return calculados.map((r, idx) => ({
    posicion: r.posicion > 0 ? r.posicion : idx + 1,
    jugador_id: r.jugador_id,
    nombre_completo: r.jugador.nombre_completo,
    alias: r.jugador.alias ?? undefined,
    foto_url: r.jugador.foto_url ?? undefined,
    club_ciudad: r.jugador.club_ciudad,
    puntos: r.puntos,
    sets_ganados: r.sets_ganados,
    sets_perdidos: r.sets_perdidos,
    carambolas_total: r.carambolas_total,
    entradas_total: r.entradas_total,
    promedio: Math.round(r.promedio * 1000) / 1000,
    promedio_particular: Math.round(r.promedio_particular * 1000) / 1000,
    mayor_serie: r.mayor_serie,
    puntos_ranking: r.puntos_ranking,
  }));
}

// ─── OBTENER RANKING POR CLUB ─────────────────────────────────────────────────

export async function obtenerRankingClub(torneo_id: string) {
  const torneo = await prisma.torneo.findUnique({ where: { id: torneo_id } });
  if (!torneo) throw new Error('Torneo no encontrado');

  const rankings = await prisma.ranking.findMany({
    where: { torneo_id },
    include: { jugador: true },
  });

  const clubMap = new Map<string, { total_puntos: number; num_jugadores: number; promedios: number[] }>();

  for (const r of rankings) {
    const club = r.jugador.club_ciudad;
    const pts = r.puntos_ranking > 0 ? r.puntos_ranking : r.puntos * (1 + torneo.incremento);
    if (!clubMap.has(club)) {
      clubMap.set(club, { total_puntos: 0, num_jugadores: 0, promedios: [] });
    }
    const entry = clubMap.get(club)!;
    entry.total_puntos += pts;
    entry.num_jugadores += 1;
    entry.promedios.push(r.promedio);
  }

  const clubes = Array.from(clubMap.entries()).map(([club, data]) => ({
    club,
    total_puntos: Math.round(data.total_puntos * 100) / 100,
    num_jugadores: data.num_jugadores,
    promedio_club:
      data.promedios.length > 0
        ? Math.round((data.promedios.reduce((a, b) => a + b, 0) / data.promedios.length) * 1000) / 1000
        : 0,
  }));

  clubes.sort((a, b) => b.total_puntos - a.total_puntos);

  return clubes.map((c, idx) => ({ posicion: idx + 1, ...c }));
}

// ─── RECALCULAR RANKING COMPLETO (Todas las estadísticas oficiales) ────────────

export async function recalcularRankingCompleto(torneo_id: string) {
  const torneo = await prisma.torneo.findUnique({ where: { id: torneo_id } });
  if (!torneo) throw new Error('Torneo no encontrado');

  // Obtener todas las partidas confirmadas del torneo
  const partidas = await prisma.partida.findMany({
    where: {
      fase: { torneo_id },
      confirmada: true,
      estado: 'finalizada',
    },
    include: {
      sets: { include: { entradas: true } },
    },
  });

  // Resetear rankings del torneo
  await prisma.ranking.deleteMany({ where: { torneo_id } });

  const acumulado = new Map<
    string,
    {
      puntos: number;
      sets_ganados: number;
      sets_perdidos: number;
      carambolas_total: number;
      entradas_total: number;
      mayor_serie: number;
      promediosPartidas: number[];
    }
  >();

  for (const partida of partidas) {
    if (!partida.ganador_id) continue;
    const jugadores = [partida.jugador_a_id, partida.jugador_b_id];

    for (const jugador_id of jugadores) {
      const gano = partida.ganador_id === jugador_id;
      let carambolas = 0;
      let entradas = 0;
      let sets_ganados = 0;
      let sets_perdidos = 0;
      let mayor_serie_partida = 0;

      for (const set of partida.sets) {
        if (set.ganador_id === jugador_id) sets_ganados++;
        else if (set.ganador_id) sets_perdidos++;

        for (const entrada of set.entradas) {
          if (entrada.jugador_id === jugador_id) {
            carambolas += entrada.carambolas;
            entradas++;
            if (entrada.carambolas > mayor_serie_partida) {
              mayor_serie_partida = entrada.carambolas;
            }
          }
        }
      }

      const prev = acumulado.get(jugador_id) ?? {
        puntos: 0,
        sets_ganados: 0,
        sets_perdidos: 0,
        carambolas_total: 0,
        entradas_total: 0,
        mayor_serie: 0,
        promediosPartidas: [],
      };

      if (entradas > 0) {
        prev.promediosPartidas.push(carambolas / entradas);
      }

      acumulado.set(jugador_id, {
        puntos: prev.puntos + (gano ? 2 : 0),
        sets_ganados: prev.sets_ganados + sets_ganados,
        sets_perdidos: prev.sets_perdidos + sets_perdidos,
        carambolas_total: prev.carambolas_total + carambolas,
        entradas_total: prev.entradas_total + entradas,
        mayor_serie: Math.max(prev.mayor_serie, mayor_serie_partida),
        promediosPartidas: prev.promediosPartidas,
      });
    }
  }

  // Insertar cada registro de ranking
  for (const [jugador_id, data] of acumulado.entries()) {
    const promedio = data.entradas_total > 0 ? data.carambolas_total / data.entradas_total : 0;
    const promedio_particular = data.promediosPartidas.length > 0 ? Math.max(...data.promediosPartidas) : 0;

    await prisma.ranking.create({
      data: {
        torneo_id,
        jugador_id,
        puntos: data.puntos,
        sets_ganados: data.sets_ganados,
        sets_perdidos: data.sets_perdidos,
        carambolas_total: data.carambolas_total,
        entradas_total: data.entradas_total,
        promedio: Math.round(promedio * 1000) / 1000,
        promedio_particular: Math.round(promedio_particular * 1000) / 1000,
        mayor_serie: data.mayor_serie,
        puntos_ranking: 0,
        posicion: 0,
      },
    });
  }

  return obtenerRankingTorneo(torneo_id);
}

// ─── ASIGNAR PUNTOS POR POSICIÓN FINAL (Escala Excel + Multiplicador) ─────────

export async function asignarPuntosPosicionFinal(torneo_id: string) {
  const torneo = await prisma.torneo.findUnique({ where: { id: torneo_id } });
  if (!torneo) throw new Error('Torneo no encontrado');

  // Asegurar que el acumulado esté actualizado
  await recalcularRankingCompleto(torneo_id);

  // Obtener los rankings ordenados por criterios UMB
  const rankings = await prisma.ranking.findMany({
    where: { torneo_id },
  });

  rankings.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.promedio !== a.promedio) return b.promedio - a.promedio;
    if (b.promedio_particular !== a.promedio_particular) return b.promedio_particular - a.promedio_particular;
    if (b.mayor_serie !== a.mayor_serie) return b.mayor_serie - a.mayor_serie;
    if (b.carambolas_total !== a.carambolas_total) return b.carambolas_total - a.carambolas_total;
    return a.entradas_total - b.entradas_total;
  });

  const factor = 1 + torneo.incremento;

  for (let i = 0; i < rankings.length; i++) {
    const posicion = i + 1;
    const base = puntosBasePorPosicion(posicion);
    const puntosRanking = Math.round(base * factor * 100) / 100;

    await prisma.ranking.update({
      where: { id: rankings[i].id },
      data: {
        posicion,
        puntos_ranking: puntosRanking,
      },
    });
  }

  return obtenerRankingTorneo(torneo_id);
}

// ─── ESTADÍSTICAS JUGADOR ─────────────────────────────────────────────────────

export async function obtenerEstadisticasJugador(jugador_id: string, torneo_id?: string) {
  const jugador = await prisma.jugador.findUnique({ where: { id: jugador_id } });
  if (!jugador) throw new Error('Jugador no encontrado');

  if (torneo_id) {
    const ranking = await prisma.ranking.findUnique({
      where: { torneo_id_jugador_id: { torneo_id, jugador_id } },
      include: { torneo: true },
    });

    const partidas = await prisma.partida.findMany({
      where: {
        OR: [{ jugador_a_id: jugador_id }, { jugador_b_id: jugador_id }],
        fase: { torneo_id },
        estado: 'finalizada',
      },
      include: {
        jugador_a: true,
        jugador_b: true,
        ganador: true,
        fase: { include: { torneo: true } },
        sets: { orderBy: { numero: 'asc' }, include: { entradas: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    return { jugador, ranking, partidas };
  }

  const rankings = await prisma.ranking.findMany({
    where: { jugador_id },
    include: { torneo: true },
    orderBy: { torneo: { fecha_inicio: 'desc' } },
  });

  const totalTorneos = rankings.length;
  const mejorPosicion = rankings.length > 0 ? Math.min(...rankings.map((r) => r.posicion).filter((p) => p > 0)) : null;

  return {
    jugador,
    estadisticas_globales: {
      promedio_historico: jugador.promedio_historico,
      total_torneos: totalTorneos,
      mejor_posicion: mejorPosicion,
    },
    historial_torneos: rankings.map((r) => ({
      torneo_id: r.torneo_id,
      torneo_nombre: r.torneo.nombre,
      torneo_fecha: r.torneo.fecha_inicio,
      posicion: r.posicion,
      puntos: r.puntos,
      promedio: r.promedio,
      promedio_particular: r.promedio_particular,
      mayor_serie: r.mayor_serie,
      puntos_ranking: r.puntos_ranking,
    })),
  };
}
