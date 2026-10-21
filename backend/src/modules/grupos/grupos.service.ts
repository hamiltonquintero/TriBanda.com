import prisma from '../../config/prisma';
import { generarBracket } from '../bracket/bracket.service';

// ─── TABLA DE POSICIONES EN MEMORIA (Cero Queries Adicionales) ───────────────

export function calcularTablaDeGrupoEnMemoria(grupo: any) {
  const finalizadas = (grupo.partidas || []).filter((p: any) => p.estado === 'finalizada');

  const tabla = (grupo.jugadores || []).map(({ jugador }: any) => {
    let puntos = 0;
    let sets_ganados = 0;
    let sets_perdidos = 0;
    let carambolas = 0;
    let entradas = 0;
    let mayor_serie = 0;
    const promediosPartidas: number[] = [];

    for (const partida of finalizadas) {
      const esA = partida.jugador_a_id === jugador.id;
      const esB = partida.jugador_b_id === jugador.id;
      if (!esA && !esB) continue;

      const gano = partida.ganador_id === jugador.id;
      puntos += gano ? 2 : 0;

      let carambolasPartida = 0;
      let entradasPartida = 0;

      for (const set of (partida.sets || [])) {
        const esGanadorSet = set.ganador_id === jugador.id;
        if (esGanadorSet) sets_ganados++;
        else if (set.ganador_id) sets_perdidos++;

        for (const entrada of (set.entradas || [])) {
          if (entrada.jugador_id === jugador.id) {
            carambolas += entrada.carambolas;
            entradas++;
            carambolasPartida += entrada.carambolas;
            entradasPartida++;
            if (entrada.carambolas > mayor_serie) {
              mayor_serie = entrada.carambolas;
            }
          }
        }
      }

      if (entradasPartida > 0) {
        promediosPartidas.push(carambolasPartida / entradasPartida);
      }
    }

    const promedio = entradas > 0 ? carambolas / entradas : 0;
    const promedio_particular = promediosPartidas.length > 0 ? Math.max(...promediosPartidas) : 0;

    return {
      jugador_id: jugador.id,
      nombre_completo: jugador.nombre_completo,
      club: jugador.club?.nombre ?? jugador.club_ciudad,
      puntos,
      sets_ganados,
      sets_perdidos,
      carambolas,
      entradas,
      promedio: Math.round(promedio * 1000) / 1000,
      promedio_particular: Math.round(promedio_particular * 1000) / 1000,
      mayor_serie,
    };
  });

  // Orden oficial UMB / Fecolbi:
  tabla.sort((a: any, b: any) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.promedio !== a.promedio) return b.promedio - a.promedio;
    if (b.promedio_particular !== a.promedio_particular) return b.promedio_particular - a.promedio_particular;
    if (b.mayor_serie !== a.mayor_serie) return b.mayor_serie - a.mayor_serie;
    if (b.carambolas !== a.carambolas) return b.carambolas - a.carambolas;
    return a.entradas - b.entradas;
  });

  return tabla.map((fila: any, idx: number) => ({ ...fila, posicion: idx + 1 }));
}

export async function calcularTablaGrupo(grupo_id: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id: grupo_id },
    include: {
      jugadores: { include: { jugador: { include: { club: true } } } },
      partidas: {
        where: { estado: 'finalizada' },
        include: {
          sets: { include: { entradas: true } },
          jugador_a: true,
          jugador_b: true,
          ganador: true,
        },
      },
    },
  });

  if (!grupo) throw new Error('Grupo no encontrado');
  return calcularTablaDeGrupoEnMemoria(grupo);
}

// ─── LISTAR GRUPOS (Optimizada a 1 Sola Query) ───────────────────────────────

export async function listarGrupos(fase_id: string) {
  const grupos = await prisma.grupo.findMany({
    where: { fase_id },
    include: {
      jugadores: { include: { jugador: { include: { club: true } } } },
      partidas: {
        include: {
          jugador_a: true,
          jugador_b: true,
          ganador: true,
          sets: { include: { entradas: true } },
        },
      },
    },
    orderBy: { numero: 'asc' },
  });

  return grupos.map((g) => ({
    ...g,
    tabla: calcularTablaDeGrupoEnMemoria(g),
  }));
}

// ─── OBTENER GRUPO (Optimizada sin Re-Query) ──────────────────────────────────

export async function obtenerGrupo(id: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id },
    include: {
      jugadores: { include: { jugador: { include: { club: true } } } },
      partidas: {
        include: {
          jugador_a: true,
          jugador_b: true,
          juez: { select: { id: true, nombre: true, email: true } },
          ganador: true,
          sets: { include: { entradas: true } },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!grupo) throw new Error('Grupo no encontrado');

  const tabla = calcularTablaDeGrupoEnMemoria(grupo);
  return { ...grupo, tabla };
}

// ─── CREAR GRUPO ─────────────────────────────────────────────────────────────

export async function crearGrupo(data: { fase_id: string; numero: number; letra?: string }) {
  const fase = await prisma.fase.findUnique({
    where: { id: data.fase_id },
    include: { torneo: true },
  });
  if (!fase) throw new Error('Fase no encontrada');
  if (fase.torneo.estado === 'finalizado') throw new Error('No se pueden crear grupos en un torneo finalizado');

  return prisma.grupo.create({ data });
}


// ─── ASIGNAR JUGADORES ───────────────────────────────────────────────────────

export async function asignarJugadores(grupo_id: string, jugador_ids: string[]) {
  if (jugador_ids.length < 2) throw new Error('Mínimo 2 jugadores por grupo');
  if (jugador_ids.length > 6) throw new Error('Máximo 6 jugadores por grupo');

  const grupo = await prisma.grupo.findUnique({
    where: { id: grupo_id },
    include: { fase: true },
  });
  if (!grupo) throw new Error('Grupo no encontrado');

  // Verificar que ningún jugador ya esté en otro grupo de la misma fase
  const conflictos = await prisma.grupoJugador.findMany({
    where: {
      jugador_id: { in: jugador_ids },
      grupo: {
        fase_id: grupo.fase_id,
        id: { not: grupo_id },
      },
    },
    include: { jugador: true },
  });

  if (conflictos.length > 0) {
    const nombres = conflictos.map((c) => c.jugador.nombre_completo).join(', ');
    throw new Error(`Los siguientes jugadores ya están en otro grupo de esta fase: ${nombres}`);
  }

  // No se pueden quitar jugadores que ya tienen partidas iniciadas o finalizadas en este grupo
  const iniciadasGrupo = await prisma.partida.findMany({
    where: { grupo_id, estado: { in: ['en_curso', 'finalizada'] } },
    select: { jugador_a_id: true, jugador_b_id: true },
  });
  const nuevos = new Set(jugador_ids);
  const huerfano = iniciadasGrupo.some((p) => !nuevos.has(p.jugador_a_id) || !nuevos.has(p.jugador_b_id));
  if (huerfano) {
    throw new Error('No se puede quitar a un jugador que ya tiene partidas en curso o finalizadas en este grupo. Usa "Reemplazar jugador".');
  }

  // Reemplazar asignación en transacción (las partidas pendientes previas quedan obsoletas y se regeneran)
  await prisma.$transaction([
    prisma.partida.deleteMany({ where: { grupo_id, estado: 'pendiente' } }),
    prisma.grupoJugador.deleteMany({ where: { grupo_id } }),
    prisma.grupoJugador.createMany({
      data: jugador_ids.map((jugador_id) => ({ grupo_id, jugador_id })),
    }),
  ]);

  // Autogenerar partidas para este grupo inmediatamente
  try {
    await generarPartidasGrupo(grupo_id);
  } catch (err) {
    console.warn('Auto-generación de partidas tras asignar jugadores omitida:', err);
  }

  return obtenerGrupo(grupo_id);
}

// ─── SORTEO AUTOMÁTICO ───────────────────────────────────────────────────────

export async function sorteoAutomatico(fase_id: string, jugador_ids: string[], clasificados_por_grupo?: number) {
  if (clasificados_por_grupo) {
    await prisma.fase.update({
      where: { id: fase_id },
      data: { clasificados_por_grupo },
    });
  }

  const grupos = await prisma.grupo.findMany({
    where: { fase_id },
    orderBy: { numero: 'asc' },
  });

  if (grupos.length === 0) throw new Error('No hay grupos creados en esta fase');

  // Mezclar aleatoriamente (Fisher-Yates)
  const mezclados = [...jugador_ids];
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
  }

  // Distribuir equitativamente
  const asignaciones: Record<string, string[]> = {};
  grupos.forEach((g) => { asignaciones[g.id] = []; });

  mezclados.forEach((jugador_id, idx) => {
    const grupo = grupos[idx % grupos.length];
    asignaciones[grupo.id].push(jugador_id);
  });

  // Validar tamaño de grupos (entre 2 y 6 jugadores)
  for (const [gid, jids] of Object.entries(asignaciones)) {
    if (jids.length < 2) throw new Error(`El grupo quedaría con menos de 2 jugadores`);
    if (jids.length > 6) throw new Error(`El grupo quedaría con más de 6 jugadores`);
  }

  // No rehacer el sorteo si ya hay partidas iniciadas o finalizadas en los grupos de la fase
  const iniciadasFase = await prisma.partida.count({
    where: { fase_id, grupo_id: { not: null }, estado: { in: ['en_curso', 'finalizada'] } },
  });
  if (iniciadasFase > 0) {
    throw new Error('No se puede rehacer el sorteo: ya hay partidas en curso o finalizadas en esta fase');
  }

  // Limpiar y reasignar en transacción (incluyendo partidas pendientes previas)
  await prisma.$transaction([
    prisma.partida.deleteMany({
      where: { fase_id, grupo_id: { not: null }, estado: 'pendiente' },
    }),
    prisma.grupoJugador.deleteMany({ where: { grupo: { fase_id } } }),
    prisma.grupoJugador.createMany({
      data: Object.entries(asignaciones).flatMap(([grupo_id, jids]) =>
        jids.map((jugador_id) => ({ grupo_id, jugador_id }))
      ),
    }),
  ]);

  // Autogenerar partidas inmediatamente tras el sorteo
  try {
    await generarPartidasFase(fase_id);
  } catch (err) {
    console.warn('Auto-generación de partidas tras sorteo omitida:', err);
  }

  return listarGrupos(fase_id);
}

// ─── GENERAR PARTIDAS AUTOMÁTICAS DE GRUPOS (Liguilla / Round-Robin) O PLAYOFFS ────

export async function generarPartidasFase(fase_id: string) {
  const fase = await prisma.fase.findUnique({
    where: { id: fase_id },
    include: {
      torneo: true,
      grupos: {
        orderBy: { numero: 'asc' },
        include: { jugadores: { include: { jugador: true } } },
      },
    },
  });

  if (!fase) throw new Error('Fase no encontrada');

  // Si es fase de llaves o final, generar el cuadro/bracket automáticamente
  if (fase.tipo === 'llaves' || fase.tipo === 'final') {
    // 1. Buscar si hay una fase previa de grupos para obtener los clasificados
    const faseGruposPrevia = await prisma.fase.findFirst({
      where: {
        torneo_id: fase.torneo_id,
        tipo: { in: ['grupos', 'clasificatorio'] },
        orden: { lt: fase.orden },
      },
      orderBy: { orden: 'desc' },
    });

    let jugador_ids: string[] = [];

    if (faseGruposPrevia) {
      try {
        const info = await obtenerClasificados(faseGruposPrevia.id);
        jugador_ids = (info.tabla_general || []).map((j: any) => j.jugador_id);
      } catch (err) {
        console.warn('No se pudieron obtener clasificados de grupos previa:', err);
      }
    }

    // Si no hay clasificados de grupos previa, tomar los inscritos del torneo
    if (jugador_ids.length < 2) {
      const inscritos = await prisma.inscripcionTorneo.findMany({
        where: { torneo_id: fase.torneo_id },
        orderBy: { created_at: 'asc' },
      });
      jugador_ids = inscritos.map((i) => i.jugador_id);
    }

    if (jugador_ids.length < 2) {
      throw new Error('Se requieren al menos 2 jugadores inscritos para generar las llaves/playoffs.');
    }

    await generarBracket(fase_id, jugador_ids);
    const partidasBracket = await prisma.partida.findMany({
      where: { fase_id },
      include: { jugador_a: true, jugador_b: true },
    });
    return {
      total_creadas: partidasBracket.length,
      partidas: partidasBracket,
      mensaje: `¡Cuadro de llaves generado exitosamente con ${partidasBracket.length} partidas!`,
    };
  }

  // Si no hay grupos creados pero hay al menos 3 inscritos, auto-crear grupos estándar
  if (!fase.grupos || fase.grupos.length === 0) {
    const inscritos = await prisma.inscripcionTorneo.findMany({
      where: { torneo_id: fase.torneo_id },
      orderBy: { created_at: 'asc' },
    });
    if (inscritos.length >= 3) {
      const jugador_ids = inscritos.map((i) => i.jugador_id);
      await sorteoAutomatico(fase_id, jugador_ids, fase.clasificados_por_grupo ?? 2);
      const faseActualizada = await prisma.fase.findUnique({
        where: { id: fase_id },
        include: {
          torneo: true,
          grupos: {
            orderBy: { numero: 'asc' },
            include: { jugadores: { include: { jugador: true } } },
          },
        },
      });
      if (faseActualizada?.grupos) {
        fase.grupos = faseActualizada.grupos;
      }
    } else {
      throw new Error('Esta fase no tiene grupos creados. Ve a la sección de Grupos y realiza el sorteo o crea grupos primero.');
    }
  }

  // Si los grupos existen pero están vacíos y hay inscritos, repartirlos
  let gruposConJugadores = fase.grupos.filter((g) => g.jugadores && g.jugadores.length >= 2);
  if (gruposConJugadores.length === 0) {
    const inscritos = await prisma.inscripcionTorneo.findMany({
      where: { torneo_id: fase.torneo_id },
      orderBy: { created_at: 'asc' },
    });
    if (inscritos.length >= 2) {
      const jugador_ids = inscritos.map((i) => i.jugador_id);
      await sorteoAutomatico(fase_id, jugador_ids, fase.clasificados_por_grupo ?? 2);
      const faseActualizada = await prisma.fase.findUnique({
        where: { id: fase_id },
        include: {
          torneo: true,
          grupos: {
            orderBy: { numero: 'asc' },
            include: { jugadores: { include: { jugador: true } } },
          },
        },
      });
      if (faseActualizada?.grupos) {
        fase.grupos = faseActualizada.grupos;
        gruposConJugadores = fase.grupos.filter((g) => g.jugadores && g.jugadores.length >= 2);
      }
    } else {
      throw new Error('Los grupos aún no tienen suficientes jugadores asignados (mínimo 2 por grupo). Realiza el sorteo de mesas primero.');
    }
  }

  const totalSets = Math.max(1, Math.round(Number(fase.torneo.modalidad === 'profesional' ? (fase.torneo.total_sets_default || 3) : 1)));
  const setsCreate = Array.from({ length: totalSets }, (_, k) => ({ numero: k + 1 }));

  let defaultMeta = Math.round(Number(fase.torneo.meta_base || 30));
  let esModoLibre = Boolean(fase.torneo.modo_libre);

  if (fase.torneo.modalidad === 'relampago') {
    defaultMeta = fase.torneo.distancia_relampago === 'corto' ? 10 : 18;
    esModoLibre = true;
  }

  // Obtener metas individuales de inscripciones si existen
  const inscripciones = await prisma.inscripcionTorneo.findMany({
    where: { torneo_id: fase.torneo_id },
  });
  const metaMap = new Map<string, number>();
  inscripciones.forEach((i) => {
    if (i.jugador_id && i.meta_puntos) {
      metaMap.set(i.jugador_id, Math.round(Number(i.meta_puntos)));
    }
  });

  const partidasCreadas = [];

  for (const grupo of fase.grupos) {
    const jugadores = (grupo.jugadores || [])
      .map((gj) => gj.jugador)
      .filter((j): j is NonNullable<typeof j> => Boolean(j && j.id));
    if (jugadores.length < 2) continue;

    // Cruces ya existentes en el grupo (sin importar el orden A/B)
    const existentes = await prisma.partida.findMany({
      where: { grupo_id: grupo.id },
      select: { jugador_a_id: true, jugador_b_id: true },
    });
    const parKey = (x: string, y: string) => [x, y].sort().join('|');
    const paresExistentes = new Set(existentes.map((p) => parKey(p.jugador_a_id, p.jugador_b_id)));

    for (let i = 0; i < jugadores.length; i++) {
      for (let j = i + 1; j < jugadores.length; j++) {
        if (paresExistentes.has(parKey(jugadores[i].id, jugadores[j].id))) continue;
        const metaA = Math.round(Number(metaMap.get(jugadores[i].id) ?? defaultMeta)) || 30;
        const metaB = Math.round(Number(metaMap.get(jugadores[j].id) ?? defaultMeta)) || 30;
        const limiteEntradas = esModoLibre
          ? null
          : (fase.torneo.limite_entradas ? Math.round(Number(fase.torneo.limite_entradas)) : null);

        const partida = await prisma.partida.create({
          data: {
            fase_id,
            grupo_id: grupo.id,
            jugador_a_id: jugadores[i].id,
            jugador_b_id: jugadores[j].id,
            total_sets: totalSets,
            meta_a: metaA,
            meta_b: metaB,
            limite_entradas: limiteEntradas,
            modo_libre: esModoLibre,
            estado: 'pendiente',
            sets: {
              create: setsCreate,
            },
          },
        });
        partidasCreadas.push(partida);
      }
    }
  }

  const todasPartidas = await prisma.partida.findMany({
    where: { fase_id },
    include: { jugador_a: true, jugador_b: true },
  });

  return {
    total_creadas: partidasCreadas.length,
    partidas: partidasCreadas,
    total_existentes: todasPartidas.length,
    mensaje:
      partidasCreadas.length > 0
        ? `Se generaron ${partidasCreadas.length} nuevas partidas para esta fase.`
        : `Todas las partidas (${todasPartidas.length}) ya estaban generadas y listas para jugar.`,
  };
}

// ─── AUTO-ASIGNAR JUECES / MESAS A LA PRIMERA RONDA DE LA FASE ───────────────

export async function autoAsignarJuecesFase(fase_id: string) {
  const fase = await prisma.fase.findUnique({
    where: { id: fase_id },
    include: {
      grupos: {
        orderBy: { numero: 'asc' },
        include: {
          partidas: {
            where: { estado: 'pendiente' },
            orderBy: { created_at: 'asc' },
            include: { jugador_a: true, jugador_b: true },
          },
        },
      },
    },
  });

  if (!fase) throw new Error('Fase no encontrada');

  const jueces = await prisma.usuario.findMany({
    where: { rol: 'juez', activo: true },
    orderBy: { nombre: 'asc' },
  });

  if (jueces.length === 0) {
    throw new Error('No hay jueces oficiales registrados en el sistema');
  }

  const asignaciones = [];

  // Asignar secuencialmente a la primera partida de cada grupo:
  // Grupo 1, Partida 1 -> Juez Mesa 1
  // Grupo 2, Partida 1 -> Juez Mesa 2
  // Grupo 3, Partida 1 -> Juez Mesa 3
  for (let i = 0; i < fase.grupos.length; i++) {
    const grupo = fase.grupos[i];
    const primeraPartida = grupo.partidas[0];
    if (!primeraPartida) continue;

    const juez = jueces[i % jueces.length];
    const updated = await prisma.partida.update({
      where: { id: primeraPartida.id },
      data: { juez_id: juez.id },
      include: {
        jugador_a: true,
        jugador_b: true,
      },
    });

    asignaciones.push({
      grupo_numero: grupo.numero,
      partida_id: updated.id,
      juez_id: juez.id,
      juez_nombre: juez.nombre,
      jugador_a: updated.jugador_a.nombre_completo,
      jugador_b: updated.jugador_b.nombre_completo,
    });
  }

  return { total_asignadas: asignaciones.length, asignaciones };
}

// ─── CLASIFICADOS Y TABLA GENERAL UNIFICADA (L. GENERAL) ─────────────────────

export async function obtenerClasificados(fase_id: string, clasificadosPorGrupoOverride?: number) {
  const fase = await prisma.fase.findUnique({
    where: { id: fase_id },
    include: { torneo: true },
  });

  if (!fase) throw new Error('Fase no encontrada');

  const grupos = await prisma.grupo.findMany({
    where: { fase_id },
    include: {
      jugadores: { include: { jugador: { include: { club: true } } } },
      partidas: {
        include: {
          jugador_a: true,
          jugador_b: true,
          ganador: true,
          sets: { include: { entradas: true } },
        },
      },
    },
    orderBy: { numero: 'asc' },
  });

  const clasificadosPorGrupo = clasificadosPorGrupoOverride ?? fase.clasificados_por_grupo ?? 2;

  // 1. Obtener clasificados por cada grupo (Cálculo directo en memoria)
  const gruposConClasificados = grupos.map((g) => {
    const tabla = calcularTablaDeGrupoEnMemoria(g);
    // Tomar hasta N clasificados según regla (ej. 2 mejores por grupo)
    const cantClasifican = Math.min(clasificadosPorGrupo, tabla.length);
    const clasificadosDelGrupo = tabla.slice(0, cantClasifican).map((fila: any) => ({
      ...fila,
      grupo_id: g.id,
      grupo_numero: g.numero,
      grupo_letra: g.letra,
      posicion_en_grupo: fila.posicion,
    }));

    return {
      grupo_id: g.id,
      grupo_numero: g.numero,
      grupo_letra: g.letra,
      tabla,
      clasificados: clasificadosDelGrupo,
    };
  });

  // 2. Unificar en Tabla General de Clasificados (como en el Excel "L. GENERAL")
  const todosClasificados = gruposConClasificados.flatMap((g) => g.clasificados);

  // Ordenar la Tabla General de Siembra:
  // Criterios oficiales UMB / Federación: Puntos, Promedio General, Promedio Particular, Mayor Serie, Carambolas, Menos Entradas
  todosClasificados.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.promedio !== a.promedio) return b.promedio - a.promedio;
    if (b.promedio_particular !== a.promedio_particular) return b.promedio_particular - a.promedio_particular;
    if (b.mayor_serie !== a.mayor_serie) return b.mayor_serie - a.mayor_serie;
    if (b.carambolas !== a.carambolas) return b.carambolas - a.carambolas;
    return a.entradas - b.entradas;
  });

  // Asignar Siembra General (Semilla 1, Semilla 2, ... Semilla N)
  const tablaGeneralSembrada = todosClasificados.map((j, idx) => ({
    ...j,
    siembra_general: idx + 1,
  }));

  // 3. Cálculo de la Ronda de Ajuste (Matemática del Cliente)
  const N = tablaGeneralSembrada.length;
  let potencia = 1;
  while (potencia * 2 <= N) {
    potencia *= 2;
  }
  // Si N < 2 (caso extremo), potencia mínima es 2 si hay al menos 2
  if (potencia < 2 && N >= 2) potencia = 2;

  const sobrantes = N > potencia ? N - potencia : 0;
  const jueganAjuste = sobrantes * 2;
  const pasanDirecto = N - jueganAjuste;

  const clasificadosDirectos = tablaGeneralSembrada.slice(0, pasanDirecto);
  const participantesAjuste = tablaGeneralSembrada.slice(pasanDirecto);

  // Cruces de ajuste sugeridos: el mejor del repechaje vs el peor, etc.
  const crucesAjusteSugeridos: { jugador_a: typeof tablaGeneralSembrada[0]; jugador_b: typeof tablaGeneralSembrada[0]; match_num: number }[] = [];
  const totalCruces = sobrantes;
  for (let i = 0; i < totalCruces; i++) {
    const a = participantesAjuste[i];
    const b = participantesAjuste[participantesAjuste.length - 1 - i];
    if (a && b && a.jugador_id !== b.jugador_id) {
      crucesAjusteSugeridos.push({
        match_num: i + 1,
        jugador_a: a,
        jugador_b: b,
      });
    }
  }

  return {
    fase_id,
    clasificados_por_grupo: clasificadosPorGrupo,
    total_clasificados: N,
    grupos: gruposConClasificados,
    tabla_general: tablaGeneralSembrada,
    esquema_ajuste: {
      total_clasificados: N,
      potencia_objetivo: potencia,
      sobrantes,
      clasificados_directos_count: pasanDirecto,
      juegan_ajuste_count: jueganAjuste,
      clasificados_directos: clasificadosDirectos,
      participantes_ajuste: participantesAjuste,
      cruces_ajuste: crucesAjusteSugeridos,
    },
  };
}

// ─── ELIMINAR GRUPO ──────────────────────────────────────────────────────────

export async function eliminarGrupo(id: string) {
  const partidasActivas = await prisma.partida.findMany({
    where: {
      grupo_id: id,
      estado: { in: ['en_curso', 'finalizada'] },
    },
  });

  if (partidasActivas.length > 0) {
    throw new Error('No se puede eliminar un grupo que ya tiene partidas en curso o finalizadas');
  }

  // Eliminar partidas pendientes y asignaciones
  await prisma.partida.deleteMany({ where: { grupo_id: id } });
  await prisma.grupoJugador.deleteMany({ where: { grupo_id: id } });
  return prisma.grupo.delete({ where: { id } });
}

// ─── REEMPLAZAR JUGADOR EN GRUPO ─────────────────────────────────────────────

export async function reemplazarJugador(grupo_id: string, jugador_saliente_id: string, jugador_entrante_id: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id: grupo_id },
    include: { fase: true },
  });
  if (!grupo) throw new Error('Grupo no encontrado');

  const gj = await prisma.grupoJugador.findUnique({
    where: { grupo_id_jugador_id: { grupo_id, jugador_id: jugador_saliente_id } },
  });
  if (!gj) throw new Error('El jugador saliente no está en este grupo');

  const conflicto = await prisma.grupoJugador.findFirst({
    where: {
      jugador_id: jugador_entrante_id,
      grupo: { fase_id: grupo.fase_id },
    },
    include: { jugador: true },
  });
  if (conflicto) throw new Error(`El jugador entrante ya está asignado en otro grupo de esta fase`);

  // Reemplazar en GrupoJugador
  await prisma.grupoJugador.delete({
    where: { grupo_id_jugador_id: { grupo_id, jugador_id: jugador_saliente_id } },
  });
  await prisma.grupoJugador.create({
    data: { grupo_id, jugador_id: jugador_entrante_id },
  });

  // Reemplazar en partidas pendientes del grupo
  const partidasPendientes = await prisma.partida.findMany({
    where: {
      grupo_id,
      estado: 'pendiente',
      OR: [
        { jugador_a_id: jugador_saliente_id },
        { jugador_b_id: jugador_saliente_id },
      ],
    },
  });

  // Meta (handicap) del jugador entrante según su inscripción
  const insEntrante = await prisma.inscripcionTorneo.findUnique({
    where: { torneo_id_jugador_id: { torneo_id: grupo.fase.torneo_id, jugador_id: jugador_entrante_id } },
  });

  for (const p of partidasPendientes) {
    const saleEsA = p.jugador_a_id === jugador_saliente_id;
    await prisma.partida.update({
      where: { id: p.id },
      data: {
        jugador_a_id: saleEsA ? jugador_entrante_id : p.jugador_a_id,
        jugador_b_id: !saleEsA ? jugador_entrante_id : p.jugador_b_id,
        ...(insEntrante?.meta_puntos
          ? (saleEsA ? { meta_a: Math.round(Number(insEntrante.meta_puntos)) } : { meta_b: Math.round(Number(insEntrante.meta_puntos)) })
          : {}),
      },
    });
  }

  return obtenerGrupo(grupo_id);
}

// ─── ELIMINAR JUGADOR DE GRUPO ───────────────────────────────────────────────

export async function eliminarJugadorDeGrupo(grupo_id: string, jugador_id: string) {
  const gj = await prisma.grupoJugador.findUnique({
    where: { grupo_id_jugador_id: { grupo_id, jugador_id } },
  });
  if (!gj) throw new Error('El jugador no está en este grupo');

  // Eliminar partidas pendientes donde participa este jugador
  await prisma.partida.deleteMany({
    where: {
      grupo_id,
      estado: 'pendiente',
      OR: [{ jugador_a_id: jugador_id }, { jugador_b_id: jugador_id }],
    },
  });

  await prisma.grupoJugador.delete({
    where: { grupo_id_jugador_id: { grupo_id, jugador_id } },
  });

  return obtenerGrupo(grupo_id);
}


// ─── AGREGAR JUGADOR A GRUPO ─────────────────────────────────────────────────

export async function agregarJugadorAGrupo(grupo_id: string, jugador_id: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id: grupo_id },
    include: {
      fase: { include: { torneo: true } },
      jugadores: true,
      partidas: true,
    },
  });
  if (!grupo) throw new Error('Grupo no encontrado');

  const conflicto = await prisma.grupoJugador.findFirst({
    where: {
      jugador_id,
      grupo: { fase_id: grupo.fase_id },
    },
  });
  if (conflicto) throw new Error('El jugador ya pertenece a un grupo en esta fase');

  if (grupo.jugadores.length >= 6) throw new Error('El grupo ya tiene el máximo de 6 jugadores');

  await prisma.grupoJugador.create({
    data: { grupo_id, jugador_id },
  });

  // Si el grupo ya tiene partidas generadas, generar cruces pendientes con los demás
  if (grupo.partidas.length > 0) {
    const otrosJugadores = grupo.jugadores.map((j) => j.jugador_id);
    const totalSets = grupo.fase.torneo.modalidad === 'profesional' ? (grupo.fase.torneo.total_sets_default || 3) : 1;
    const setsCreate = Array.from({ length: totalSets }, (_, k) => ({ numero: k + 1 }));

    let defaultMeta = grupo.fase.torneo.meta_base || 30;
    let esModoLibre = grupo.fase.torneo.modo_libre;
    if (grupo.fase.torneo.modalidad === 'relampago') {
      defaultMeta = grupo.fase.torneo.distancia_relampago === 'corto' ? 10 : 18;
      esModoLibre = true;
    }

    // Metas individuales (handicap) según inscripción
    const inscripciones = await prisma.inscripcionTorneo.findMany({
      where: { torneo_id: grupo.fase.torneo_id, jugador_id: { in: [...otrosJugadores, jugador_id] } },
    });
    const metaDe = (id: string) => {
      const ins = inscripciones.find((i) => i.jugador_id === id);
      return ins?.meta_puntos ? Math.round(Number(ins.meta_puntos)) : defaultMeta;
    };

    for (const otroId of otrosJugadores) {
      await prisma.partida.create({
        data: {
          fase_id: grupo.fase_id,
          grupo_id,
          jugador_a_id: otroId,
          jugador_b_id: jugador_id,
          total_sets: totalSets,
          meta_a: metaDe(otroId),
          meta_b: metaDe(jugador_id),
          limite_entradas: esModoLibre ? null : grupo.fase.torneo.limite_entradas,
          modo_libre: esModoLibre,
          estado: 'pendiente',
          sets: { create: setsCreate },
        },
      });
    }
  }

  return obtenerGrupo(grupo_id);
}

// ─── GENERAR PARTIDAS PARA UN SOLO GRUPO ────────────────────────────────────

export async function generarPartidasGrupo(grupo_id: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id: grupo_id },
    include: {
      fase: { include: { torneo: true } },
      jugadores: { include: { jugador: true } },
      partidas: true,
    },
  });

  if (!grupo) throw new Error('Grupo no encontrado');
  const parKey = (x: string, y: string) => [x, y].sort().join('|');
  const paresExistentes = new Set(grupo.partidas.map((p) => parKey(p.jugador_a_id, p.jugador_b_id)));

  const jugadores = (grupo.jugadores || [])
    .map((gj) => gj.jugador)
    .filter((j): j is NonNullable<typeof j> => Boolean(j && j.id));
  if (jugadores.length < 2) throw new Error('Se necesitan al menos 2 jugadores para generar partidas');

  const totalSets = Math.max(1, Math.round(Number(grupo.fase.torneo.modalidad === 'profesional' ? (grupo.fase.torneo.total_sets_default || 3) : 1)));
  const setsCreate = Array.from({ length: totalSets }, (_, k) => ({ numero: k + 1 }));

  let defaultMeta = Math.round(Number(grupo.fase.torneo.meta_base || 30));
  let esModoLibre = Boolean(grupo.fase.torneo.modo_libre);
  if (grupo.fase.torneo.modalidad === 'relampago') {
    defaultMeta = grupo.fase.torneo.distancia_relampago === 'corto' ? 10 : 18;
    esModoLibre = true;
  }

  const inscripciones = await prisma.inscripcionTorneo.findMany({
    where: { torneo_id: grupo.fase.torneo_id },
  });
  const metaMap = new Map<string, number>();
  inscripciones.forEach((i) => {
    if (i.jugador_id && i.meta_puntos) {
      metaMap.set(i.jugador_id, Math.round(Number(i.meta_puntos)));
    }
  });

  const partidasCreadas = [];
  for (let i = 0; i < jugadores.length; i++) {
    for (let j = i + 1; j < jugadores.length; j++) {
      if (paresExistentes.has(parKey(jugadores[i].id, jugadores[j].id))) continue;
      const metaA = Math.round(Number(metaMap.get(jugadores[i].id) ?? defaultMeta)) || 30;
      const metaB = Math.round(Number(metaMap.get(jugadores[j].id) ?? defaultMeta)) || 30;
      const limiteEntradas = esModoLibre
        ? null
        : (grupo.fase.torneo.limite_entradas ? Math.round(Number(grupo.fase.torneo.limite_entradas)) : null);

      const partida = await prisma.partida.create({
        data: {
          fase_id: grupo.fase_id,
          grupo_id: grupo.id,
          jugador_a_id: jugadores[i].id,
          jugador_b_id: jugadores[j].id,
          total_sets: totalSets,
          meta_a: metaA,
          meta_b: metaB,
          limite_entradas: limiteEntradas,
          modo_libre: esModoLibre,
          estado: 'pendiente',
          sets: { create: setsCreate },
        },
      });
      partidasCreadas.push(partida);
    }
  }

  return {
    total_creadas: partidasCreadas.length,
    partidas: partidasCreadas,
    total_existentes: grupo.partidas.length + partidasCreadas.length,
    mensaje:
      partidasCreadas.length > 0
        ? `Se generaron ${partidasCreadas.length} nuevas partidas para este grupo.`
        : `Todas las partidas posibles (${grupo.partidas.length}) ya estaban generadas.`,
  };
}

