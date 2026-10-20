import prisma from '../../config/prisma';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function nombreRonda(ronda: number, esAjuste?: boolean): string {
  if (esAjuste || ronda === 99) return 'Ronda de Ajuste';
  const nombres: Record<number, string> = {
    2: 'Gran Final',
    4: 'Semifinales',
    8: 'Cuartos de Final',
    16: 'Octavos de Final',
    32: 'Dieciseisavos (R32)',
    64: 'Treintaidosavos',
  };
  return nombres[ronda] ?? `Ronda de ${ronda}`;
}

// Genera el orden de siembra estándar para un bracket de tamaño n (potencia de 2)
// Ej. n=32: [1, 32, 16, 17, 9, 24, 8, 25, 5, 28, 12, 21, 13, 20, 4, 29, 3, 30, 14, 19, 11, 22, 6, 27, 7, 26, 10, 23, 15, 18, 2, 31]
export function buildSeedOrder(n: number): number[] {
  if (n === 1) return [1];
  const prev = buildSeedOrder(n / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s);
    result.push(n + 1 - s);
  }
  return result;
}

// ─── GENERAR BRACKET BILATERAL (Formato Oficial Playoffs 32) ──────────────────

export async function generarBracket(fase_id: string, jugador_ids: string[], tamano_manual?: number) {
  const fase = await prisma.fase.findUnique({
    where: { id: fase_id },
    include: { torneo: true },
  });
  if (!fase) throw new Error('Fase no encontrada');

  const N = jugador_ids.length;
  if (N < 2) throw new Error('Se requieren al menos 2 jugadores para generar el bracket');

  // 1. Eliminar llaves y partidas previas de esta fase
  await prisma.bracketSlot.deleteMany({ where: { fase_id } });
  await prisma.partida.deleteMany({ where: { fase_id, grupo_id: null } });

  // 2. Determinar tamaño de cuadro P (32, 16, 8, 4)
  let P: number;
  if (tamano_manual && [4, 8, 16, 32, 64].includes(tamano_manual)) {
    P = tamano_manual;
  } else {
    // Si N <= 8 usar 8; si N <= 16 usar 16; por defecto para el formato Playoffs usar 32
    P = N <= 8 ? 8 : N <= 16 ? 16 : 32;
  }

  // Si N > P, truncar a los primeros P jugadores según el ranking
  const clasificados = jugador_ids.slice(0, P);
  const numJugadores = clasificados.length;

  // Semillas oficiales para cuadro de tamaño P
  const semillasP = buildSeedOrder(P);

  // 3. Crear todos los slots: P, P/2, P/4, ..., 2
  // Cada ronda r tiene exactamente r slots
  const todosLosSlots: {
    fase_id: string;
    ronda: number;
    posicion: number;
    jugador_id: string | null;
    es_ajuste: boolean;
  }[] = [];

  // Ronda P (Ronda inicial)
  for (let i = 0; i < P; i++) {
    const semilla = semillasP[i];
    const jugador_id = semilla <= numJugadores ? clasificados[semilla - 1] : null;
    todosLosSlots.push({
      fase_id,
      ronda: P,
      posicion: i + 1,
      jugador_id,
      es_ajuste: false,
    });
  }

  // Rondas siguientes: P/2 down to 2 (Gran Final)
  let r = Math.floor(P / 2);
  while (r >= 2) {
    for (let pos = 1; pos <= r; pos++) {
      todosLosSlots.push({
        fase_id,
        ronda: r,
        posicion: pos,
        jugador_id: null,
        es_ajuste: false,
      });
    }
    r = Math.floor(r / 2);
  }

  await prisma.bracketSlot.createMany({ data: todosLosSlots });

  // 4. Traer los slots creados para procesar cruces y pases directos (BYEs)
  const slotsCreados = await prisma.bracketSlot.findMany({
    where: { fase_id },
    orderBy: [{ ronda: 'desc' }, { posicion: 'asc' }],
  });

  const slotsMap = new Map<string, typeof slotsCreados[0]>();
  for (const s of slotsCreados) {
    slotsMap.set(`${s.ronda}_${s.posicion}`, s);
  }

  // 5. Procesar Ronda P: Partidas vs Pases Directos (BYEs)
  const numCrucesP = P / 2;
  for (let m = 0; m < numCrucesP; m++) {
    const posA = 2 * m + 1;
    const posB = 2 * m + 2;
    const slotA = slotsMap.get(`${P}_${posA}`);
    const slotB = slotsMap.get(`${P}_${posB}`);

    const jA = slotA?.jugador_id;
    const jB = slotB?.jugador_id;
    const posDestino = m + 1;
    const rondaDestino = P / 2;

    if (jA && jB) {
      // Ambos clasificados -> Se crea la partida en Ronda P
      const partida = await prisma.partida.create({
        data: {
          fase_id,
          jugador_a_id: jA,
          jugador_b_id: jB,
          total_sets: 3,
          estado: 'pendiente',
          sets: { create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }] },
        },
      });
      await prisma.bracketSlot.update({ where: { id: slotA!.id }, data: { partida_id: partida.id } });
      await prisma.bracketSlot.update({ where: { id: slotB!.id }, data: { partida_id: partida.id } });
      slotA!.partida_id = partida.id;
      slotB!.partida_id = partida.id;
    } else if (jA && !jB) {
      // Slot A tiene PASE DIRECTO (BYE) -> Avanza directo a Ronda P/2
      const slotDestino = slotsMap.get(`${rondaDestino}_${posDestino}`);
      if (slotDestino) {
        await prisma.bracketSlot.update({ where: { id: slotDestino.id }, data: { jugador_id: jA } });
        slotDestino.jugador_id = jA;
      }
    } else if (!jA && jB) {
      // Slot B tiene PASE DIRECTO (BYE) -> Avanza directo a Ronda P/2
      const slotDestino = slotsMap.get(`${rondaDestino}_${posDestino}`);
      if (slotDestino) {
        await prisma.bracketSlot.update({ where: { id: slotDestino.id }, data: { jugador_id: jB } });
        slotDestino.jugador_id = jB;
      }
    }
  }

  // 6. Revisar si en rondas siguientes ya hay cruces donde AMBOS jugadores avanzaron por BYE
  let curR = P / 2;
  while (curR >= 2) {
    const numCruces = curR / 2;
    for (let m = 0; m < numCruces; m++) {
      const posA = 2 * m + 1;
      const posB = 2 * m + 2;
      const slotA = slotsMap.get(`${curR}_${posA}`);
      const slotB = slotsMap.get(`${curR}_${posB}`);

      if (slotA?.jugador_id && slotB?.jugador_id && !slotA.partida_id && !slotB.partida_id) {
        const partida = await prisma.partida.create({
          data: {
            fase_id,
            jugador_a_id: slotA.jugador_id,
            jugador_b_id: slotB.jugador_id,
            total_sets: 3,
            estado: 'pendiente',
            sets: { create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }] },
          },
        });
        await prisma.bracketSlot.update({ where: { id: slotA.id }, data: { partida_id: partida.id } });
        await prisma.bracketSlot.update({ where: { id: slotB.id }, data: { partida_id: partida.id } });
        slotA.partida_id = partida.id;
        slotB.partida_id = partida.id;
      }
    }
    curR = Math.floor(curR / 2);
  }

  return obtenerBracket(fase_id);
}

// ─── OBTENER BRACKET ──────────────────────────────────────────────────────────

export async function obtenerBracket(fase_id: string) {
  const slots = await prisma.bracketSlot.findMany({
    where: { fase_id },
    include: {
      jugador: { include: { club: true } },
    },
    orderBy: [{ ronda: 'desc' }, { posicion: 'asc' }],
  });

  if (slots.length === 0) return { fase_id, rondas: [], campeon: null, subcampeon: null, tamano: 0 };

  const maxRonda = slots[0].ronda; // P (ej. 32 o 16)
  const semillasMaxP = buildSeedOrder(maxRonda);

  // Obtener partidas asociadas
  const partidaIds = Array.from(new Set(slots.map((s) => s.partida_id).filter(Boolean))) as string[];
  const partidas =
    partidaIds.length > 0
      ? await prisma.partida.findMany({
          where: { id: { in: partidaIds } },
          include: {
            jugador_a: true,
            jugador_b: true,
            ganador: true,
            sets: { include: { entradas: true } },
          },
        })
      : [];
  const partidaMap = new Map(partidas.map((p) => [p.id, p]));

  // Agrupar por ronda
  const rondasMap = new Map<number, typeof slots>();
  for (const slot of slots) {
    if (!rondasMap.has(slot.ronda)) rondasMap.set(slot.ronda, []);
    rondasMap.get(slot.ronda)!.push(slot);
  }

  const rondas = Array.from(rondasMap.entries())
    .sort(([a], [b]) => b - a)
    .map(([numero, rondaSlots]) => {
      const cruces: {
        slot_a: (typeof slots)[0] & { partida?: (typeof partidas)[0]; semilla?: number };
        slot_b: (typeof slots)[0] & { partida?: (typeof partidas)[0]; semilla?: number };
      }[] = [];

      for (let i = 0; i < rondaSlots.length; i += 2) {
        const semillaA = numero === maxRonda ? semillasMaxP[rondaSlots[i].posicion - 1] : undefined;
        const semillaB =
          numero === maxRonda && rondaSlots[i + 1]
            ? semillasMaxP[rondaSlots[i + 1].posicion - 1]
            : undefined;

        const slot_a = {
          ...rondaSlots[i],
          semilla: semillaA,
          partida: rondaSlots[i].partida_id ? partidaMap.get(rondaSlots[i].partida_id!) : undefined,
        };
        const slot_b = rondaSlots[i + 1]
          ? {
              ...rondaSlots[i + 1],
              semilla: semillaB,
              partida: rondaSlots[i + 1].partida_id
                ? partidaMap.get(rondaSlots[i + 1].partida_id!)
                : undefined,
            }
          : null;

        if (slot_b) cruces.push({ slot_a, slot_b });
      }

      const esAjuste = rondaSlots.some((s) => s.es_ajuste);
      return {
        numero,
        es_ajuste: esAjuste,
        nombre: nombreRonda(numero, esAjuste),
        cruces,
      };
    });

  // Determinar campeón y subcampeón de la final (ronda 2)
  const finalSlots = rondasMap.get(2);
  let campeon = null;
  let subcampeon = null;

  if (finalSlots && finalSlots.length >= 2 && finalSlots[0].partida_id) {
    const partidaFinal = partidaMap.get(finalSlots[0].partida_id!);
    if (partidaFinal?.ganador) {
      campeon = partidaFinal.ganador;
      subcampeon =
        partidaFinal.ganador_id === partidaFinal.jugador_a_id
          ? partidaFinal.jugador_b
          : partidaFinal.jugador_a;
    }
  }

  return { fase_id, tamano: maxRonda, rondas, campeon, subcampeon };
}

// ─── AVANZAR GANADOR EN BRACKET ───────────────────────────────────────────────

export async function avanzarGanador(partida_id: string) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id },
    include: { fase: true },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (!partida.ganador_id) throw new Error('La partida no tiene ganador aún');

  const slotActual = await prisma.bracketSlot.findFirst({
    where: { partida_id, fase_id: partida.fase_id },
  });
  if (!slotActual) return; // No es una partida de bracket

  const rondaActual = slotActual.ronda;
  if (rondaActual <= 2) return; // Ya es la final

  // Ronda y posición destino:
  // En cualquier cuadro binario, el cruce m (posiciones 2m-1 y 2m) produce el ganador
  // que pasa a la posición m de la ronda siguiente
  const rondaSiguiente = Math.floor(rondaActual / 2);
  const posicionDestino = Math.ceil(slotActual.posicion / 2);

  const slotDestino = await prisma.bracketSlot.findFirst({
    where: {
      fase_id: partida.fase_id,
      ronda: rondaSiguiente,
      posicion: posicionDestino,
    },
  });

  if (!slotDestino) return;

  // Actualizar jugador en slot destino
  await prisma.bracketSlot.update({
    where: { id: slotDestino.id },
    data: { jugador_id: partida.ganador_id },
  });

  // Verificar si su rival en la siguiente ronda ya está definido
  const esImpar = posicionDestino % 2 === 1;
  const posRival = esImpar ? posicionDestino + 1 : posicionDestino - 1;

  const slotRival = await prisma.bracketSlot.findFirst({
    where: {
      fase_id: partida.fase_id,
      ronda: rondaSiguiente,
      posicion: posRival,
    },
  });

  if (slotRival?.jugador_id && !slotDestino.partida_id && !slotRival.partida_id) {
    const jA = esImpar ? partida.ganador_id : slotRival.jugador_id;
    const jB = esImpar ? slotRival.jugador_id : partida.ganador_id;

    const nuevaPartida = await prisma.partida.create({
      data: {
        fase_id: partida.fase_id,
        jugador_a_id: jA,
        jugador_b_id: jB,
        total_sets: 3,
        estado: 'pendiente',
        sets: { create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }] },
      },
    });

    await prisma.bracketSlot.update({
      where: { id: slotDestino.id },
      data: { partida_id: nuevaPartida.id },
    });
    await prisma.bracketSlot.update({
      where: { id: slotRival.id },
      data: { partida_id: nuevaPartida.id },
    });
  }
}

// ─── CLASIFICADOS BRACKET ─────────────────────────────────────────────────────

export async function obtenerClasificadosBracket(fase_id: string) {
  const bracket = await obtenerBracket(fase_id);
  return { campeon: bracket.campeon, subcampeon: bracket.subcampeon };
}
