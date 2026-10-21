import prisma from '../../config/prisma';
import { recalcularPromedioHistorico } from '../jugadores/jugadores.service';
import { avanzarGanador } from '../bracket/bracket.service';
import { recalcularRankingCompleto } from '../ranking/ranking.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function evaluarResultadoSet(
  sumaA: number,
  sumaB: number,
  metaA: number | null,
  metaB: number | null
): { ganador_posible: 'a' | 'b' | null; es_empate: boolean } {
  const mA = metaA ?? 10;
  const mB = metaB ?? 10;
  const alcanzoA = sumaA >= mA;
  const alcanzoB = sumaB >= mB;

  if (alcanzoA && !alcanzoB) {
    return { ganador_posible: 'a', es_empate: false };
  }
  if (alcanzoB && !alcanzoA) {
    return { ganador_posible: 'b', es_empate: false };
  }

  // Si ninguno alcanzó la meta o ambos alcanzaron la meta en la misma entrada:
  // Se evalúa la ventaja reglamentaria de handicap
  if (mB > mA) {
    const ventaja = mB - mA;
    const diff = sumaB - sumaA;
    if (diff > ventaja) return { ganador_posible: 'b', es_empate: false };
    if (diff < ventaja) return { ganador_posible: 'a', es_empate: false };
    return { ganador_posible: null, es_empate: true };
  } else if (mA > mB) {
    const ventaja = mA - mB;
    const diff = sumaA - sumaB;
    if (diff > ventaja) return { ganador_posible: 'a', es_empate: false };
    if (diff < ventaja) return { ganador_posible: 'b', es_empate: false };
    return { ganador_posible: null, es_empate: true };
  } else {
    // Mismo handicap
    if (sumaA > sumaB) return { ganador_posible: 'a', es_empate: false };
    if (sumaB > sumaA) return { ganador_posible: 'b', es_empate: false };
    return { ganador_posible: null, es_empate: true };
  }
}

async function calcularGanadorSet(set_id: string): Promise<string | null> {
  const set = await prisma.set.findUnique({
    where: { id: set_id },
    include: { entradas: true, partida: true },
  });
  if (!set) return null;

  // Si el set ya fue definido por Carambola de Oro u otro desempate manual, mantenerlo
  if (set.desempate_oro && set.ganador_id) {
    return set.ganador_id;
  }

  const { jugador_a_id, jugador_b_id, meta_a, meta_b } = set.partida;
  const sumaA = set.entradas.filter((e) => e.jugador_id === jugador_a_id).reduce((acc, e) => acc + e.carambolas, 0);
  const sumaB = set.entradas.filter((e) => e.jugador_id === jugador_b_id).reduce((acc, e) => acc + e.carambolas, 0);

  const { ganador_posible, es_empate } = evaluarResultadoSet(sumaA, sumaB, meta_a, meta_b);

  if (es_empate) {
    // Empate exacto: no se asigna ganador automáticamente, queda pendiente para Carambola de Oro
    await prisma.set.update({ where: { id: set_id }, data: { ganador_id: null } });
    return null;
  }

  const ganador_id = ganador_posible === 'a' ? jugador_a_id : jugador_b_id;
  await prisma.set.update({ where: { id: set_id }, data: { ganador_id } });
  return ganador_id;
}

async function calcularGanadorPartida(partida_id: string): Promise<string | null> {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id },
    include: { sets: true },
  });
  if (!partida) return null;

  const { jugador_a_id, jugador_b_id } = partida;
  const setsA = partida.sets.filter((s) => s.ganador_id === jugador_a_id).length;
  const setsB = partida.sets.filter((s) => s.ganador_id === jugador_b_id).length;

  // Para ganar: mayoría estricta de sets (2 de 3, 1 de 1, 2 de 2, 3 de 5)
  const setsParaGanar = Math.floor(partida.total_sets / 2) + 1;

  if (setsA >= setsParaGanar || setsB >= setsParaGanar) {
    const ganador_id = setsA >= setsParaGanar ? jugador_a_id : jugador_b_id;
    await prisma.partida.update({
      where: { id: partida_id },
      data: { ganador_id, estado: 'finalizada' },
    });
    return ganador_id;
  }
  return null;
}

async function actualizarRanking(partida_id: string) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id },
    include: { fase: true },
  });
  if (!partida || !partida.ganador_id) return;
  await recalcularRankingCompleto(partida.fase.torneo_id);
}

// ─── LISTAR PARTIDAS ─────────────────────────────────────────────────────────

export async function listarPartidas(
  torneo_id: string,
  filtros?: { fase_id?: string; estado?: string; jugador_id?: string }
) {
  return prisma.partida.findMany({
    where: {
      fase: { torneo_id },
      ...(filtros?.fase_id && { fase_id: filtros.fase_id }),
      ...(filtros?.estado && { estado: filtros.estado as any }),
      ...(filtros?.jugador_id && {
        OR: [{ jugador_a_id: filtros.jugador_id }, { jugador_b_id: filtros.jugador_id }],
      }),
    },
    include: {
      jugador_a: true, jugador_b: true,
      juez: { select: { id: true, nombre: true, email: true } },
      ganador: true, fase: true, grupo: true,
    },
    orderBy: [
      { grupo: { numero: 'asc' } },
      { created_at: 'asc' },
    ],
  });
}

// ─── OBTENER PARTIDA ─────────────────────────────────────────────────────────

export async function obtenerPartida(id: string) {
  const partida = await prisma.partida.findUnique({
    where: { id },
    include: {
      jugador_a: { include: { club: true } },
      jugador_b: { include: { club: true } },
      juez: { select: { id: true, nombre: true, email: true } },
      ganador: true,
      fase: { include: { torneo: true } },
      grupo: true,
      sets: { orderBy: { numero: 'asc' }, include: { entradas: { orderBy: { numero_entrada: 'asc' } }, ganador: true } },
    },
  });
  if (!partida) throw new Error('Partida no encontrada');
  return partida;
}

// ─── CREAR PARTIDA ───────────────────────────────────────────────────────────

export async function crearPartida(data: {
  fase_id: string;
  grupo_id?: string;
  jugador_a_id: string;
  jugador_b_id: string;
  juez_id?: string;
  fecha?: string;
  hora?: string;
  total_sets?: number;
  meta_a?: number;
  meta_b?: number;
}) {
  const fase = await prisma.fase.findUnique({
    where: { id: data.fase_id },
    include: { torneo: true },
  });
  if (!fase) throw new Error('Fase no encontrada');

  const totalSets = Math.max(
    1,
    Math.round(
      Number(
        data.total_sets ||
          (fase.torneo.modalidad === 'profesional'
            ? fase.torneo.total_sets_default || 3
            : 1)
      )
    )
  );

  let defaultMeta = Math.round(Number(fase.torneo.meta_base || 30));
  let esModoLibre = Boolean(fase.torneo.modo_libre);
  if (fase.torneo.modalidad === 'relampago') {
    defaultMeta = fase.torneo.distancia_relampago === 'corto' ? 10 : 18;
    esModoLibre = true;
  }

  // Si no se pasaron metas individuales, buscarlas en InscripcionTorneo
  let metaA = data.meta_a ? Math.round(Number(data.meta_a)) : undefined;
  let metaB = data.meta_b ? Math.round(Number(data.meta_b)) : undefined;

  if (!metaA || !metaB) {
    const inscripciones = await prisma.inscripcionTorneo.findMany({
      where: {
        torneo_id: fase.torneo_id,
        jugador_id: { in: [data.jugador_a_id, data.jugador_b_id] },
      },
    });
    const map = new Map(inscripciones.map((i) => [i.jugador_id, i.meta_puntos]));
    if (!metaA) metaA = Math.round(Number(map.get(data.jugador_a_id) ?? defaultMeta)) || 30;
    if (!metaB) metaB = Math.round(Number(map.get(data.jugador_b_id) ?? defaultMeta)) || 30;
  }

  const limiteEntradas = esModoLibre
    ? null
    : (fase.torneo.limite_entradas ? Math.round(Number(fase.torneo.limite_entradas)) : null);

  const setsCreate = Array.from({ length: totalSets }, (_, k) => ({ numero: k + 1 }));

  let parsedFecha: Date | null = null;
  if (data.fecha && data.fecha.trim()) {
    const d = new Date(data.fecha);
    if (!isNaN(d.getTime())) parsedFecha = d;
  }

  return prisma.partida.create({
    data: {
      fase_id: data.fase_id,
      grupo_id: data.grupo_id || undefined,
      jugador_a_id: data.jugador_a_id,
      jugador_b_id: data.jugador_b_id,
      juez_id: data.juez_id || undefined,
      fecha: parsedFecha,
      hora: data.hora || undefined,
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
    include: {
      jugador_a: true,
      jugador_b: true,
      juez: { select: { id: true, nombre: true, email: true } },
      fase: true,
      sets: true,
    },
  });
}

// ─── INICIAR PARTIDA ─────────────────────────────────────────────────────────

export async function iniciarPartida(
  id: string,
  opciones?: {
    jugador_salida_id?: string;
    color_bola_a?: string;
    color_bola_b?: string;
    meta_a?: number;
    meta_b?: number;
    limite_entradas?: number | null;
    modo_libre?: boolean;
    juez_id?: string | null;
    juez_nombre?: string | null;
  },
  juez_id?: string
) {
  const partida = await prisma.partida.findUnique({ where: { id }, include: { sets: { select: { numero: true } } } });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'pendiente') throw new Error('La partida ya fue iniciada o finalizada');

  const salidaInicial = opciones?.jugador_salida_id || partida.jugador_salida_id || partida.jugador_a_id;
  const contraInicial = salidaInicial === partida.jugador_a_id ? partida.jugador_b_id : partida.jugador_a_id;

  // Solo crear los sets que aún no existen (grupos y llaves ya los crean al generarse)
  const numerosExistentes = new Set(partida.sets.map((s) => s.numero));
  const setsData = Array.from({ length: partida.total_sets }, (_, i) => {
    const num = i + 1;
    const turnoSalida = num % 2 === 1 ? salidaInicial : contraInicial;
    return {
      partida_id: id,
      numero: num,
      turno_jugador_id: turnoSalida,
    };
  }).filter((s) => !numerosExistentes.has(s.numero));

  const updateData: any = { estado: 'en_curso' };

  if (opciones?.juez_id) {
    updateData.juez_id = opciones.juez_id;
  } else if (opciones?.juez_nombre && opciones.juez_nombre.trim()) {
    const nombreTrim = opciones.juez_nombre.trim();
    let juezUsuario = await prisma.usuario.findFirst({
      where: { nombre: { equals: nombreTrim, mode: 'insensitive' } },
    });
    if (!juezUsuario) {
      const emailRandom = `juez.${Date.now()}@billar.com`;
      juezUsuario = await prisma.usuario.create({
        data: {
          nombre: nombreTrim,
          email: emailRandom,
          password_hash: '$2b$10$wK1Vq9Zq6YjMekJqjR0dIe4uK6f5C5UvG/QhZq6YjMekJqjR0dIe4',
          rol: 'juez',
        },
      });
    }
    updateData.juez_id = juezUsuario.id;
  } else if (!partida.juez_id && juez_id) {
    updateData.juez_id = juez_id;
  }

  if (opciones) {
    if (opciones.jugador_salida_id !== undefined) updateData.jugador_salida_id = opciones.jugador_salida_id || null;
    if (opciones.color_bola_a !== undefined) updateData.color_bola_a = opciones.color_bola_a;
    if (opciones.color_bola_b !== undefined) updateData.color_bola_b = opciones.color_bola_b;
    if (opciones.meta_a !== undefined) updateData.meta_a = opciones.meta_a;
    if (opciones.meta_b !== undefined) updateData.meta_b = opciones.meta_b;
    if (opciones.limite_entradas !== undefined) updateData.limite_entradas = opciones.limite_entradas;
    if (opciones.modo_libre !== undefined) updateData.modo_libre = opciones.modo_libre;
  }

  await prisma.$transaction([
    prisma.partida.update({ where: { id }, data: updateData }),
    ...(setsData.length > 0 ? [prisma.set.createMany({ data: setsData })] : []),
  ]);

  // Asegurar que el Set 1 tenga turno_jugador_id seteado a la salida inicial
  await prisma.set.updateMany({
    where: { partida_id: id, numero: 1 },
    data: { turno_jugador_id: salidaInicial },
  });

  // Asegurar entrada 1 con 0 carambolas para el jugador que inicia
  const set1 = await prisma.set.findFirst({
    where: { partida_id: id, numero: 1 },
    include: { entradas: true },
  });
  if (set1 && set1.entradas.length === 0) {
    await prisma.entradaSet.create({
      data: {
        set_id: set1.id,
        jugador_id: salidaInicial,
        numero_entrada: 1,
        carambolas: 0,
      },
    });
  }

  return obtenerPartida(id);
}

// ─── REGISTRAR ENTRADA (planilla clásica) ────────────────────────────────────

export async function registrarEntrada(
  partida_id: string,
  data: { set_numero: number; numero_entrada: number; carambolas_a: number; carambolas_b: number }
) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id }, include: { sets: true },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'en_curso') throw new Error('La partida no está en curso');
  
  const maxLimite = partida.modo_libre ? 100 : (partida.limite_entradas ?? 100);
  if (data.numero_entrada < 1 || data.numero_entrada > maxLimite) {
    throw new Error(`Entrada debe estar entre 1 y ${maxLimite}`);
  }

  const set = partida.sets.find((s) => s.numero === data.set_numero);
  if (!set) throw new Error(`Set ${data.set_numero} no encontrado`);

  // Upsert jugador A
  const existA = await prisma.entradaSet.findFirst({
    where: { set_id: set.id, jugador_id: partida.jugador_a_id, numero_entrada: data.numero_entrada },
  });
  if (existA) await prisma.entradaSet.update({ where: { id: existA.id }, data: { carambolas: data.carambolas_a } });
  else await prisma.entradaSet.create({ data: { set_id: set.id, jugador_id: partida.jugador_a_id, numero_entrada: data.numero_entrada, carambolas: data.carambolas_a } });

  // Upsert jugador B
  const existB = await prisma.entradaSet.findFirst({
    where: { set_id: set.id, jugador_id: partida.jugador_b_id, numero_entrada: data.numero_entrada },
  });
  if (existB) await prisma.entradaSet.update({ where: { id: existB.id }, data: { carambolas: data.carambolas_b } });
  else await prisma.entradaSet.create({ data: { set_id: set.id, jugador_id: partida.jugador_b_id, numero_entrada: data.numero_entrada, carambolas: data.carambolas_b } });

  const limiteEntradas = partida.modo_libre ? null : (partida.limite_entradas ?? null);
  if (limiteEntradas && data.numero_entrada >= limiteEntradas) {
    await calcularGanadorSet(set.id);
    await calcularGanadorPartida(partida_id);
  }

  return obtenerPartida(partida_id);
}

// ─── TURNOS Y ENTRADAS (REGLAMENTARIO) ───────────────────────────────────────

export function resolverSalidaYContraSet(
  partida: { jugador_a_id: string; jugador_b_id: string; jugador_salida_id: string | null },
  setNumero: number
) {
  const lagWinnerId = partida.jugador_salida_id || partida.jugador_a_id;
  const salidaId = setNumero % 2 === 1
    ? lagWinnerId
    : (lagWinnerId === partida.jugador_a_id ? partida.jugador_b_id : partida.jugador_a_id);
  const contraId = salidaId === partida.jugador_a_id ? partida.jugador_b_id : partida.jugador_a_id;
  return { salidaId, contraId };
}

// ─── MARCADOR DIGITAL: +1 / -1 carambola ────────────────────────────────────

export async function marcadorAccion(
  partida_id: string,
  data: { jugador_id: string; accion: 'sumar' | 'restar'; set_numero: number }
) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id },
    include: { sets: { include: { entradas: true } } },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'en_curso') throw new Error('La partida no está en curso');
  if (data.jugador_id !== partida.jugador_a_id && data.jugador_id !== partida.jugador_b_id) {
    throw new Error('El jugador no pertenece a esta partida');
  }

  const set = partida.sets.find((s) => s.numero === data.set_numero);
  if (!set) throw new Error(`Set ${data.set_numero} no encontrado`);
  if (set.ganador_id) throw new Error(`El set ${data.set_numero} ya está finalizado`);

  const { salidaId, contraId } = resolverSalidaYContraSet(partida, set.numero);
  const turnoActualId = set.turno_jugador_id || salidaId;

  // REGLA 1 & 2: El espacio del jugador fuera de turno queda TOTALMENTE BLOQUEADO
  if (data.jugador_id !== turnoActualId) {
    throw new Error('No es el turno de este jugador. El juez debe autorizar el cambio de turno primero.');
  }

  // REGLA 3: Verificar si el set ya alcanzó el límite reglamentario de entradas o está en desempate
  const limiteEntradas = partida.modo_libre ? null : (partida.limite_entradas ?? null);
  const entradasSalida = set.entradas.filter((e) => e.jugador_id === salidaId);
  const entradasContra = set.entradas.filter((e) => e.jugador_id === contraId);

  const sumaA = set.entradas.filter((e) => e.jugador_id === partida.jugador_a_id).reduce((acc, e) => acc + e.carambolas, 0);
  const sumaB = set.entradas.filter((e) => e.jugador_id === partida.jugador_b_id).reduce((acc, e) => acc + e.carambolas, 0);
  const { es_empate } = evaluarResultadoSet(sumaA, sumaB, partida.meta_a, partida.meta_b);

  if (limiteEntradas && entradasSalida.length >= limiteEntradas && entradasContra.length >= limiteEntradas) {
    throw new Error('Se ha completado el límite reglamentario de entradas. Debe definirse el set o la Carambola de Oro.');
  }

  if (es_empate && limiteEntradas && entradasSalida.length >= limiteEntradas && entradasContra.length >= limiteEntradas) {
    throw new Error('El set se encuentra en desempate por Carambola de Oro. No se pueden modificar carambolas.');
  }

  // Buscar la última entrada del jugador en turno
  const entradasJugador = set.entradas
    .filter((e) => e.jugador_id === data.jugador_id)
    .sort((a, b) => b.numero_entrada - a.numero_entrada);
  let entradaActual = entradasJugador[0];

  if (!entradaActual) {
    if (data.accion === 'restar') throw new Error('No hay carambolas para restar');
    entradaActual = await prisma.entradaSet.create({
      data: { set_id: set.id, jugador_id: data.jugador_id, numero_entrada: 1, carambolas: 1 },
    });
  } else {
    const nuevas = data.accion === 'sumar'
      ? entradaActual.carambolas + 1
      : Math.max(0, entradaActual.carambolas - 1);
    if (nuevas !== entradaActual.carambolas) {
      await prisma.entradaSet.update({ where: { id: entradaActual.id }, data: { carambolas: nuevas } });
      entradaActual.carambolas = nuevas;
    }
  }

  // Verificar si con esta carambola se alcanza la meta de handicap
  const updatedEntradas = await prisma.entradaSet.findMany({ where: { set_id: set.id } });
  const totalA = updatedEntradas.filter((e) => e.jugador_id === partida.jugador_a_id).reduce((acc, e) => acc + e.carambolas, 0);
  const totalB = updatedEntradas.filter((e) => e.jugador_id === partida.jugador_b_id).reduce((acc, e) => acc + e.carambolas, 0);
  const cantA = updatedEntradas.filter((e) => e.jugador_id === partida.jugador_a_id).length;
  const cantB = updatedEntradas.filter((e) => e.jugador_id === partida.jugador_b_id).length;

  if (cantA === cantB && (partida.meta_a || partida.meta_b)) {
    const metaA = partida.meta_a ?? 999;
    const metaB = partida.meta_b ?? 999;
    if (totalA >= metaA || totalB >= metaB) {
      await calcularGanadorSet(set.id);
      await calcularGanadorPartida(partida.id);
    }
  }

  return obtenerMarcador(partida_id);
}

// ─── CAMBIO DE TURNO (alternancia reglamentaria autorizada por el juez) ───────

export async function cambioTurno(partida_id: string, set_numero: number) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id },
    include: { sets: { include: { entradas: true } } },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'en_curso') throw new Error('La partida no está en curso');

  const set = partida.sets.find((s) => s.numero === set_numero);
  if (!set) throw new Error(`Set ${set_numero} no encontrado`);
  if (set.ganador_id) throw new Error(`El set ${set_numero} ya está finalizado`);

  const { salidaId, contraId } = resolverSalidaYContraSet(partida, set.numero);
  const turnoActualId = set.turno_jugador_id || salidaId;
  const limiteEntradas = partida.modo_libre ? null : (partida.limite_entradas ?? null);

  const entradasSalida = set.entradas.filter((e) => e.jugador_id === salidaId).sort((a, b) => a.numero_entrada - b.numero_entrada);
  const entradasContra = set.entradas.filter((e) => e.jugador_id === contraId).sort((a, b) => a.numero_entrada - b.numero_entrada);

  const numEntradasSalida = entradasSalida.length;
  const numEntradasContra = entradasContra.length;

  // Si ya se había alcanzado el límite reglamentario de entradas para ambos jugadores:
  if (limiteEntradas && numEntradasSalida >= limiteEntradas && numEntradasContra >= limiteEntradas) {
    await calcularGanadorSet(set.id);
    await calcularGanadorPartida(partida.id);
    return obtenerMarcador(partida_id);
  }

  // ── CASO 1: El turno lo tenía el jugador de SALIDA ──
  if (turnoActualId === salidaId) {
    // Termina el tiro del jugador de salida: asegurar que su entrada exista
    const numEntrada = Math.max(numEntradasSalida, 1);
    if (numEntradasSalida === 0) {
      await prisma.entradaSet.create({
        data: { set_id: set.id, jugador_id: salidaId, numero_entrada: 1, carambolas: 0 },
      });
    }

    // El turno pasa al jugador de CONTRA-SALIDA
    // Abrir o asegurar la entrada de contra-salida para este mismo número de entrada
    const entradaContraExistente = entradasContra.find((e) => e.numero_entrada === numEntrada);
    if (!entradaContraExistente) {
      await prisma.entradaSet.create({
        data: { set_id: set.id, jugador_id: contraId, numero_entrada: numEntrada, carambolas: 0 },
      });
    }

    await prisma.set.update({
      where: { id: set.id },
      data: { turno_jugador_id: contraId },
    });

    return obtenerMarcador(partida_id);
  }

  // ── CASO 2: El turno lo tenía el jugador de CONTRA-SALIDA ──
  // En este punto, ambos jugadores completaron la entrada actual
  const entradaActualNumero = Math.max(numEntradasContra, 1);

  if (numEntradasContra === 0) {
    await prisma.entradaSet.create({
      data: { set_id: set.id, jugador_id: contraId, numero_entrada: 1, carambolas: 0 },
    });
  }

  // Recalcular carambolas acumuladas en el set tras finalizar la entrada completa
  const allEntradas = await prisma.entradaSet.findMany({ where: { set_id: set.id } });
  const sumaA = allEntradas.filter((e) => e.jugador_id === partida.jugador_a_id).reduce((acc, e) => acc + e.carambolas, 0);
  const sumaB = allEntradas.filter((e) => e.jugador_id === partida.jugador_b_id).reduce((acc, e) => acc + e.carambolas, 0);
  const metaA = partida.meta_a ?? 999;
  const metaB = partida.meta_b ?? 999;

  const { ganador_posible, es_empate } = evaluarResultadoSet(sumaA, sumaB, partida.meta_a, partida.meta_b);

  const limiteAlcanzado = limiteEntradas !== null && entradaActualNumero >= limiteEntradas;
  const metaAlcanzada = (partida.meta_a && sumaA >= metaA) || (partida.meta_b && sumaB >= metaB);

  if (limiteAlcanzado || metaAlcanzada) {
    if (es_empate) {
      // REGLA 3: EMPATE TÉCNICO AL LÍMITE DE ENTRADAS O METAS:
      // Se congela el set para la Carambola de Oro.
      // NO se crean más entradas, NO se permite avanzar más.
      await prisma.set.update({
        where: { id: set.id },
        data: { ganador_id: null },
      });
      return obtenerMarcador(partida_id);
    } else {
      // Hay ganador reglamentario:
      const ganadorId = ganador_posible === 'a' ? partida.jugador_a_id : partida.jugador_b_id;
      await prisma.set.update({
        where: { id: set.id },
        data: { ganador_id: ganadorId },
      });
      await calcularGanadorPartida(partida.id);
      return obtenerMarcador(partida_id);
    }
  }

  // Si no ha terminado el set: el turno vuelve a SALIDA para la siguiente entrada
  const siguienteEntrada = entradaActualNumero + 1;
  await prisma.entradaSet.create({
    data: { set_id: set.id, jugador_id: salidaId, numero_entrada: siguienteEntrada, carambolas: 0 },
  });

  await prisma.set.update({
    where: { id: set.id },
    data: { turno_jugador_id: salidaId },
  });

  return obtenerMarcador(partida_id);
}

// ─── OBTENER MARCADOR (estado en tiempo real) ────────────────────────────────

export async function obtenerMarcador(id: string) {
  const partida = await obtenerPartida(id);

  const sets = partida.sets.map((set) => {
    const entradasA = set.entradas.filter((e) => e.jugador_id === partida.jugador_a_id);
    const entradasB = set.entradas.filter((e) => e.jugador_id === partida.jugador_b_id);
    const carambolasA = entradasA.reduce((acc, e) => acc + e.carambolas, 0);
    const carambolasB = entradasB.reduce((acc, e) => acc + e.carambolas, 0);

    const { salidaId, contraId } = resolverSalidaYContraSet(partida, set.numero);
    const turnoJugadorId = set.turno_jugador_id || salidaId;

    const limiteEntradas = partida.modo_libre ? null : (partida.limite_entradas ?? null);
    const limiteAlcanzado = !partida.modo_libre && !!limiteEntradas && entradasA.length >= limiteEntradas && entradasB.length >= limiteEntradas;

    const { es_empate } = evaluarResultadoSet(carambolasA, carambolasB, partida.meta_a, partida.meta_b);

    return {
      numero: set.numero,
      ganador_id: set.ganador_id,
      desempate_oro: !!set.desempate_oro,
      es_empate: es_empate && !set.ganador_id,
      limite_entradas_alcanzado: limiteAlcanzado,
      jugador_salida_id: salidaId,
      turno_jugador_id: turnoJugadorId,
      carambolas_a: carambolasA,
      carambolas_b: carambolasB,
      entradas_a: entradasA.length,
      entradas_b: entradasB.length,
      entrada_actual_a: entradasA.length > 0 ? entradasA[entradasA.length - 1] : null,
      entrada_actual_b: entradasB.length > 0 ? entradasB[entradasB.length - 1] : null,
    };
  });

  const totalCarA = sets.reduce((a, s) => a + s.carambolas_a, 0);
  const totalCarB = sets.reduce((a, s) => a + s.carambolas_b, 0);
  const totalEntA = sets.reduce((a, s) => a + s.entradas_a, 0);
  const totalEntB = sets.reduce((a, s) => a + s.entradas_b, 0);
  const setsGanadosA = sets.filter((s) => s.ganador_id === partida.jugador_a_id).length;
  const setsGanadosB = sets.filter((s) => s.ganador_id === partida.jugador_b_id).length;

  return {
    partida_id: partida.id,
    estado: partida.estado,
    total_sets: partida.total_sets,
    confirmada: partida.confirmada,
    meta_a: partida.meta_a,
    meta_b: partida.meta_b,
    jugador_salida_id: partida.jugador_salida_id,
    color_bola_a: partida.color_bola_a ?? 'blanca',
    color_bola_b: partida.color_bola_b ?? 'amarilla',
    limite_entradas: partida.limite_entradas,
    modo_libre: partida.modo_libre,
    jugador_a: partida.jugador_a,
    jugador_b: partida.jugador_b,
    juez: partida.juez,
    ganador: partida.ganador,
    sets,
    resumen: {
      carambolas_a: totalCarA, carambolas_b: totalCarB,
      entradas_a: totalEntA, entradas_b: totalEntB,
      sets_ganados_a: setsGanadosA, sets_ganados_b: setsGanadosB,
      promedio_a: totalEntA > 0 ? Math.round((totalCarA / totalEntA) * 1000) / 1000 : 0,
      promedio_b: totalEntB > 0 ? Math.round((totalCarB / totalEntB) * 1000) / 1000 : 0,
    },
  };
}

// ─── FINALIZAR SET MANUALMENTE (desde marcador) ──────────────────────────────

export async function finalizarSet(partida_id: string, set_numero: number) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id }, include: { sets: true },
  });
  if (!partida) throw new Error('Partida no encontrada');
  const set = partida.sets.find((s) => s.numero === set_numero);
  if (!set) throw new Error(`Set ${set_numero} no encontrado`);

  await calcularGanadorSet(set.id);
  await calcularGanadorPartida(partida_id);
  return obtenerMarcador(partida_id);
}

// ─── DESEMPATE POR CARAMBOLA DE ORO ─────────────────────────────────────────

export async function resolverDesempateSet(
  partida_id: string,
  set_numero: number,
  ganador_id: string,
  usuario_id?: string
) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id },
    include: { sets: true },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (ganador_id !== partida.jugador_a_id && ganador_id !== partida.jugador_b_id) {
    throw new Error('El ganador debe ser uno de los dos jugadores de la partida');
  }

  const set = partida.sets.find((s) => s.numero === set_numero);
  if (!set) throw new Error(`Set ${set_numero} no encontrado`);

  // Actualizar el ganador del set con bandera de desempate_oro = true
  await prisma.set.update({
    where: { id: set.id },
    data: {
      ganador_id,
      desempate_oro: true,
    },
  });

  // Registrar en el audit_log
  const logPrevio = Array.isArray(partida.audit_log) ? (partida.audit_log as any[]) : [];
  const nuevoLog = [
    ...logPrevio,
    {
      evento: 'desempate_carambola_oro',
      set_numero,
      ganador_id,
      usuario_id: usuario_id || null,
      timestamp: new Date().toISOString(),
      descripcion: `Set ${set_numero} definido por Carambola de Oro a favor de ${
        ganador_id === partida.jugador_a_id ? 'Jugador A' : 'Jugador B'
      }`,
    },
  ];

  await prisma.partida.update({
    where: { id: partida_id },
    data: { audit_log: nuevoLog },
  });

  // Recalcular si ya se define la partida
  await calcularGanadorPartida(partida_id);

  return obtenerMarcador(partida_id);
}

export async function confirmarPartida(id: string, usuario_id: string, usuario_rol: string) {
  const partida = await prisma.partida.findUnique({
    where: { id },
    include: {
      fase: { select: { torneo_id: true } },
      juez: { select: { id: true, email: true } },
    },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.confirmada && partida.bloqueada) throw new Error('La partida ya fue confirmada');
  if (partida.estado !== 'finalizada') throw new Error('La partida no está finalizada');

  const esJuezAutoGenerado = partida.juez?.email?.startsWith('juez.');
  if (usuario_rol !== 'admin' && partida.juez_id && partida.juez_id !== usuario_id && !esJuezAutoGenerado) {
    throw new Error('Solo el juez asignado o un admin puede confirmar');
  }

  const currentAudit = Array.isArray(partida.audit_log) ? (partida.audit_log as any[]) : [];
  currentAudit.push({
    evento: 'confirmacion',
    usuario_id,
    usuario_rol,
    fecha: new Date().toISOString(),
  });

  await prisma.partida.update({
    where: { id },
    data: {
      confirmada: true,
      bloqueada: true,
      solicitud_reapertura: false,
      audit_log: currentAudit,
    },
  });

  await actualizarRanking(id);

  // Actualizar promedio histórico de ambos jugadores
  await recalcularPromedioHistorico(partida.jugador_a_id);
  await recalcularPromedioHistorico(partida.jugador_b_id);

  // Avanzar ganador en bracket si aplica
  try { await avanzarGanador(id); } catch (err) {
    console.warn('[BRACKET] No se pudo avanzar el ganador:', err instanceof Error ? err.message : err);
  }

  return obtenerPartida(id);
}

// ─── SOLICITAR CORRECCIÓN (Juez -> Admin) ────────────────────────────────────

export async function solicitarCorreccion(id: string, usuario_id: string, motivo: string) {
  const partida = await prisma.partida.findUnique({ where: { id } });
  if (!partida) throw new Error('Partida no encontrada');
  if (!partida.confirmada) throw new Error('Solo se solicita corrección de partidas confirmadas');

  const currentAudit = Array.isArray(partida.audit_log) ? (partida.audit_log as any[]) : [];
  currentAudit.push({
    evento: 'solicitud_reapertura',
    usuario_id,
    motivo,
    fecha: new Date().toISOString(),
  });

  return prisma.partida.update({
    where: { id },
    data: {
      solicitud_reapertura: true,
      motivo_reapertura: motivo,
      audit_log: currentAudit,
    },
  });
}

// ─── REABRIR PARTIDA (Admin aprueba desbloqueo para corrección) ───────────────

export async function reabrirPartida(id: string, admin_id: string, motivo?: string) {
  const partida = await prisma.partida.findUnique({
    where: { id },
    include: { fase: true },
  });
  if (!partida) throw new Error('Partida no encontrada');

  const currentAudit = Array.isArray(partida.audit_log) ? (partida.audit_log as any[]) : [];
  currentAudit.push({
    evento: 'reapertura_aprobada',
    admin_id,
    motivo: motivo ?? 'Reapertura autorizada por administrador',
    fecha: new Date().toISOString(),
  });

  if (partida.estado === 'pendiente') throw new Error('La partida aún no se ha iniciado, no hay nada que reabrir');

  // Limpiar el último set decidido (el que cerró la partida) para poder corregirlo en el marcador
  const setDecisivo = await prisma.set.findFirst({
    where: { partida_id: id, ganador_id: { not: null } },
    orderBy: { numero: 'desc' },
  });

  const [partidaActualizada] = await prisma.$transaction([
    prisma.partida.update({
      where: { id },
      data: {
        confirmada: false,
        bloqueada: false,
        solicitud_reapertura: false,
        motivo_reapertura: null,
        estado: 'en_curso',
        ganador_id: null,
        audit_log: currentAudit,
      },
    }),
    ...(setDecisivo
      ? [prisma.set.update({ where: { id: setDecisivo.id }, data: { ganador_id: null, desempate_oro: false } })]
      : []),
  ]);

  // Recalcular rankings inmediatamente
  await recalcularRankingCompleto(partida.fase.torneo_id);

  return partidaActualizada;
}

// ─── RECHAZAR SOLICITUD DE CORRECCIÓN (Admin) ────────────────────────────────

export async function rechazarCorreccion(id: string, admin_id: string, motivo_rechazo?: string) {
  const partida = await prisma.partida.findUnique({ where: { id } });
  if (!partida) throw new Error('Partida no encontrada');

  const currentAudit = Array.isArray(partida.audit_log) ? (partida.audit_log as any[]) : [];
  currentAudit.push({
    evento: 'solicitud_rechazada',
    admin_id,
    motivo: motivo_rechazo ?? 'Rechazada por administrador',
    fecha: new Date().toISOString(),
  });

  return prisma.partida.update({
    where: { id },
    data: {
      solicitud_reapertura: false,
      audit_log: currentAudit,
    },
  });
}

// ─── LISTAR SOLICITUDES DE CORRECCIÓN PENDIENTES ─────────────────────────────

export async function listarSolicitudesCorreccion(torneo_id?: string) {
  return prisma.partida.findMany({
    where: {
      solicitud_reapertura: true,
      ...(torneo_id && { fase: { torneo_id } }),
    },
    include: {
      jugador_a: true,
      jugador_b: true,
      juez: { select: { id: true, nombre: true, email: true } },
      fase: { include: { torneo: true } },
      grupo: true,
    },
    orderBy: { created_at: 'desc' },
  });
}

// ─── PLANILLA ────────────────────────────────────────────────────────────────

export async function obtenerPlanilla(id: string) {
  const partida = await obtenerPartida(id);

  const maxEntradas = Math.max(
    ...partida.sets.flatMap((s) => s.entradas.map((e) => e.numero_entrada)),
    0
  );
  const limitePartida = partida.modo_libre ? null : (partida.limite_entradas ?? null);
  const cantidadFilas = limitePartida
    ? Math.max(limitePartida, maxEntradas)
    : Math.max(20, maxEntradas + 3);

  const sets = partida.sets.map((set) => {
    const entradasA = set.entradas.filter((e) => e.jugador_id === partida.jugador_a_id);
    const entradasB = set.entradas.filter((e) => e.jugador_id === partida.jugador_b_id);

    const filas = Array.from({ length: cantidadFilas }, (_, i) => {
      const num = i + 1;
      const entA = entradasA.find((e) => e.numero_entrada === num);
      const entB = entradasB.find((e) => e.numero_entrada === num);
      const totalA = entradasA.filter((e) => e.numero_entrada <= num).reduce((acc, e) => acc + e.carambolas, 0);
      const totalB = entradasB.filter((e) => e.numero_entrada <= num).reduce((acc, e) => acc + e.carambolas, 0);

      return {
        numero_entrada: num,
        carambolas_a: entA?.carambolas ?? null,
        total_a: entA ? totalA : null,
        carambolas_b: entB?.carambolas ?? null,
        total_b: entB ? totalB : null,
      };
    });

    return {
      numero: set.numero,
      ganador_id: set.ganador_id,
      ganador: set.ganador,
      desempate_oro: set.desempate_oro,
      filas,
      total_carambolas_a: entradasA.reduce((acc, e) => acc + e.carambolas, 0),
      total_carambolas_b: entradasB.reduce((acc, e) => acc + e.carambolas, 0),
    };
  });

  const totalCarA = sets.reduce((a, s) => a + s.total_carambolas_a, 0);
  const totalCarB = sets.reduce((a, s) => a + s.total_carambolas_b, 0);
  const totalEntA = partida.sets.reduce((a, s) => a + s.entradas.filter((e) => e.jugador_id === partida.jugador_a_id).length, 0);
  const totalEntB = partida.sets.reduce((a, s) => a + s.entradas.filter((e) => e.jugador_id === partida.jugador_b_id).length, 0);

  return {
    encabezado: {
      jugador_a: partida.jugador_a,
      jugador_b: partida.jugador_b,
      juez: partida.juez,
      fecha: partida.fecha,
      fase: partida.fase,
      jugador_salida_id: partida.jugador_salida_id,
      color_bola_a: partida.color_bola_a ?? 'blanca',
      color_bola_b: partida.color_bola_b ?? 'amarilla',
      meta_a: partida.meta_a,
      meta_b: partida.meta_b,
      limite_entradas: partida.limite_entradas,
      modo_libre: partida.modo_libre,
    },
    estado: partida.estado, confirmada: partida.confirmada, ganador: partida.ganador,
    total_sets: partida.total_sets,
    sets,
    resumen: {
      total_carambolas_a: totalCarA, total_carambolas_b: totalCarB,
      total_entradas_a: totalEntA, total_entradas_b: totalEntB,
      sets_ganados_a: partida.sets.filter((s) => s.ganador_id === partida.jugador_a_id).length,
      sets_ganados_b: partida.sets.filter((s) => s.ganador_id === partida.jugador_b_id).length,
      promedio_a: totalEntA > 0 ? Math.round((totalCarA / totalEntA) * 1000) / 1000 : 0,
      promedio_b: totalEntB > 0 ? Math.round((totalCarB / totalEntB) * 1000) / 1000 : 0,
    },
  };
}

// ─── HISTORIAL JUGADOR ───────────────────────────────────────────────────────

export async function historialJugador(jugador_id: string, torneo_id?: string) {
  return prisma.partida.findMany({
    where: {
      OR: [{ jugador_a_id: jugador_id }, { jugador_b_id: jugador_id }],
      ...(torneo_id && { fase: { torneo_id } }),
    },
    include: {
      jugador_a: true, jugador_b: true, ganador: true,
      fase: { include: { torneo: true } },
      sets: { orderBy: { numero: 'asc' }, include: { ganador: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

// ─── ASIGNAR JUEZ A PARTIDA ──────────────────────────────────────────────────

export async function asignarJuez(partida_id: string, juez_id?: string | null, juez_nombre?: string | null) {
  let targetJuezId = juez_id || null;

  if (!targetJuezId && juez_nombre && juez_nombre.trim()) {
    const nombreTrim = juez_nombre.trim();
    let juezUsuario = await prisma.usuario.findFirst({
      where: { nombre: { equals: nombreTrim, mode: 'insensitive' } },
    });
    if (!juezUsuario) {
      const emailRandom = `juez.${Date.now()}@billar.com`;
      juezUsuario = await prisma.usuario.create({
        data: {
          nombre: nombreTrim,
          email: emailRandom,
          password_hash: '$2b$10$wK1Vq9Zq6YjMekJqjR0dIe4uK6f5C5UvG/QhZq6YjMekJqjR0dIe4',
          rol: 'juez',
        },
      });
    }
    targetJuezId = juezUsuario.id;
  }

  return prisma.partida.update({
    where: { id: partida_id },
    data: { juez_id: targetJuezId },
    include: {
      juez: { select: { id: true, nombre: true, email: true } },
    },
  });
}

