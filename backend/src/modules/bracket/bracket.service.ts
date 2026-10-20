import prisma from '../../config/prisma';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function mayorPotenciaDe2MenorOIgual(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p < 2 ? 2 : p;
}

function nombreRonda(ronda: number, esAjuste?: boolean): string {
  if (esAjuste || ronda === 99) return 'Ronda de Ajuste';
  const nombres: Record<number, string> = {
    2: 'Final',
    4: 'Semifinales',
    8: 'Cuartos de Final',
    16: 'Octavos de Final',
    32: 'Dieciseisavos',
    64: 'Treintaidosavos',
  };
  return nombres[ronda] ?? `Ronda de ${ronda}`;
}

// Genera el orden de siembra estándar para un bracket de tamaño n (potencia de 2)
function buildSeedOrder(n: number): number[] {
  if (n === 1) return [1];
  const prev = buildSeedOrder(n / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s);
    result.push(n + 1 - s);
  }
  return result;
}

// ─── GENERAR BRACKET CON RONDA DE AJUSTE (Lógica del Cliente) ────────────────

export async function generarBracket(fase_id: string, jugador_ids: string[], tamano_manual?: number) {
  const fase = await prisma.fase.findUnique({
    where: { id: fase_id },
    include: { torneo: true },
  });
  if (!fase) throw new Error('Fase no encontrada');

  // Eliminar bracket previo si existe
  await prisma.bracketSlot.deleteMany({ where: { fase_id } });

  const N = jugador_ids.length;
  if (N < 2) throw new Error('Se requieren al menos 2 jugadores para generar el bracket');

  // 1. Determinar potencia objetivo
  let P: number;
  if (tamano_manual && [4, 8, 16, 32, 64].includes(tamano_manual)) {
    P = tamano_manual;
    if (N > P * 2) {
      jugador_ids = jugador_ids.slice(0, P * 2);
    }
  } else {
    P = mayorPotenciaDe2MenorOIgual(N);
  }

  const sobrantes = N > P ? N - P : 0;
  const jueganAjuste = sobrantes * 2;
  const pasanDirecto = N - jueganAjuste;

  // 2. Si hay sobrantes, crear la Ronda de Ajuste (ronda 99)
  if (sobrantes > 0) {
    const participantesAjuste = jugador_ids.slice(pasanDirecto);

    for (let i = 0; i < sobrantes; i++) {
      const jA_id = participantesAjuste[i];
      const jB_id = participantesAjuste[participantesAjuste.length - 1 - i];

      // Crear partida de ajuste
      const partidaAjuste = await prisma.partida.create({
        data: {
          fase_id,
          jugador_a_id: jA_id,
          jugador_b_id: jB_id,
          total_sets: 3,
          estado: 'pendiente',
          sets: {
            create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }],
          },
        },
      });

      // Crear slots para este cruce de ajuste
      await prisma.bracketSlot.createMany({
        data: [
          {
            fase_id,
            ronda: 99,
            posicion: i * 2 + 1,
            es_ajuste: true,
            jugador_id: jA_id,
            partida_id: partidaAjuste.id,
          },
          {
            fase_id,
            ronda: 99,
            posicion: i * 2 + 2,
            es_ajuste: true,
            jugador_id: jB_id,
            partida_id: partidaAjuste.id,
          },
        ],
      });
    }
  }

  // 3. Crear el Cuadro Principal de tamaño P (Ronda de P)
  const semillasP = buildSeedOrder(P);
  const slotsPrincipal: {
    fase_id: string;
    ronda: number;
    posicion: number;
    jugador_id: string | null;
    es_ajuste: boolean;
  }[] = [];

  for (let i = 0; i < P; i++) {
    const semilla = semillasP[i];
    // Si la semilla <= pasanDirecto, tiene clasificado directo
    const jugador_id = semilla <= pasanDirecto ? jugador_ids[semilla - 1] : null;
    slotsPrincipal.push({
      fase_id,
      ronda: P,
      posicion: i + 1,
      jugador_id,
      es_ajuste: false,
    });
  }

  // Crear slots de rondas siguientes hacia la final (P/2 ... 2)
  let ronda = Math.floor(P / 2);
  while (ronda >= 1) {
    const numSlots = ronda * 2;
    for (let i = 0; i < numSlots; i++) {
      slotsPrincipal.push({
        fase_id,
        ronda,
        posicion: i + 1,
        jugador_id: null,
        es_ajuste: false,
      });
    }
    ronda = Math.floor(ronda / 2);
  }

  await prisma.bracketSlot.createMany({
    data: slotsPrincipal,
  });

  // 4. Para los cruces de Ronda de P donde AMBOS jugadores ya se conocen, crear la partida de una vez
  const slotsRondaP = await prisma.bracketSlot.findMany({
    where: { fase_id, ronda: P, es_ajuste: false },
    orderBy: { posicion: 'asc' },
  });

  for (let i = 0; i < slotsRondaP.length; i += 2) {
    const slotA = slotsRondaP[i];
    const slotB = slotsRondaP[i + 1];

    if (slotA?.jugador_id && slotB?.jugador_id) {
      const partidaRondaP = await prisma.partida.create({
        data: {
          fase_id,
          jugador_a_id: slotA.jugador_id,
          jugador_b_id: slotB.jugador_id,
          total_sets: 3,
          estado: 'pendiente',
          sets: {
            create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }],
          },
        },
      });

      await prisma.bracketSlot.update({
        where: { id: slotA.id },
        data: { partida_id: partidaRondaP.id },
      });
      await prisma.bracketSlot.update({
        where: { id: slotB.id },
        data: { partida_id: partidaRondaP.id },
      });
    }
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

  if (slots.length === 0) return { fase_id, rondas: [], campeon: null, subcampeon: null };

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
        slot_a: (typeof slots)[0] & { partida?: (typeof partidas)[0] };
        slot_b: (typeof slots)[0] & { partida?: (typeof partidas)[0] };
      }[] = [];

      for (let i = 0; i < rondaSlots.length; i += 2) {
        const slot_a = {
          ...rondaSlots[i],
          partida: rondaSlots[i].partida_id ? partidaMap.get(rondaSlots[i].partida_id!) : undefined,
        };
        const slot_b = rondaSlots[i + 1]
          ? {
              ...rondaSlots[i + 1],
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

  // Determinar campeón y subcampeón de la final (ronda 2, posición 1 y 2)
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

  return { fase_id, rondas, campeon, subcampeon };
}

// ─── AVANZAR GANADOR (Ajuste o Cuadro Principal) ─────────────────────────────

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

  // CASO 1: PARTIDA DE RONDA DE AJUSTE (ronda 99)
  if (slotActual.es_ajuste || slotActual.ronda === 99) {
    // Número de cruce de ajuste: 0, 1, 2, ...
    const matchIndex = Math.floor((slotActual.posicion - 1) / 2);

    // Obtener los slots del cuadro principal (Ronda P)
    const todosSlots = await prisma.bracketSlot.findMany({
      where: { fase_id: partida.fase_id, es_ajuste: false },
      orderBy: [{ ronda: 'desc' }, { posicion: 'asc' }],
    });
    if (todosSlots.length === 0) return;

    const maxRondaP = todosSlots[0].ronda; // P
    const slotsP = todosSlots.filter((s) => s.ronda === maxRondaP);
    const semillasP = buildSeedOrder(maxRondaP);

    // Los ganadores de ajuste van a los cupos vacíos correspondientes:
    // Semilla P - matchIndex (ej. semilla 16, 15, 14, 13...)
    const semillaObjetivo = maxRondaP - matchIndex;
    const indexEnRondaP = semillasP.indexOf(semillaObjetivo);

    if (indexEnRondaP !== -1 && slotsP[indexEnRondaP]) {
      const slotDestino = slotsP[indexEnRondaP];
      await prisma.bracketSlot.update({
        where: { id: slotDestino.id },
        data: { jugador_id: partida.ganador_id },
      });

      // Verificar si su rival en Ronda P ya está listo para crear la partida
      const esPosImpar = slotDestino.posicion % 2 === 1;
      const posRival = esPosImpar ? slotDestino.posicion + 1 : slotDestino.posicion - 1;
      const slotRival = slotsP.find((s) => s.posicion === posRival);

      if (slotRival?.jugador_id) {
        const jA = esPosImpar ? partida.ganador_id : slotRival.jugador_id;
        const jB = esPosImpar ? slotRival.jugador_id : partida.ganador_id;

        const nuevaPartida = await prisma.partida.create({
          data: {
            fase_id: partida.fase_id,
            jugador_a_id: jA,
            jugador_b_id: jB,
            total_sets: 3,
            estado: 'pendiente',
            sets: {
              create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }],
            },
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
    return;
  }

  // CASO 2: PARTIDA DEL CUADRO PRINCIPAL (Ronda P, P/2, ..., 2)
  const rondaSiguiente = Math.floor(slotActual.ronda / 2);
  if (rondaSiguiente < 1) return; // Ya es la final

  const posicionSiguiente = Math.ceil(slotActual.posicion / 2);
  const esPosicionA = slotActual.posicion % 2 === 1;
  const posSlotSiguiente = esPosicionA ? posicionSiguiente * 2 - 1 : posicionSiguiente * 2;

  // Actualizar slot siguiente con el ganador
  const slotDestino = await prisma.bracketSlot.findFirst({
    where: {
      fase_id: partida.fase_id,
      ronda: rondaSiguiente,
      posicion: posSlotSiguiente,
    },
  });

  if (slotDestino) {
    await prisma.bracketSlot.update({
      where: { id: slotDestino.id },
      data: { jugador_id: partida.ganador_id },
    });

    // Verificar si el rival del siguiente cruce ya está esperando
    const posRival = esPosicionA ? posSlotSiguiente + 1 : posSlotSiguiente - 1;
    const slotRival = await prisma.bracketSlot.findFirst({
      where: {
        fase_id: partida.fase_id,
        ronda: rondaSiguiente,
        posicion: posRival,
      },
    });

    if (slotRival?.jugador_id && !slotDestino.partida_id) {
      const jA = esPosicionA ? partida.ganador_id : slotRival.jugador_id;
      const jB = esPosicionA ? slotRival.jugador_id : partida.ganador_id;

      const nuevaPartida = await prisma.partida.create({
        data: {
          fase_id: partida.fase_id,
          jugador_a_id: jA,
          jugador_b_id: jB,
          total_sets: 3,
          estado: 'pendiente',
          sets: {
            create: [{ numero: 1 }, { numero: 2 }, { numero: 3 }],
          },
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
}

// ─── CLASIFICADOS BRACKET ─────────────────────────────────────────────────────

export async function obtenerClasificadosBracket(fase_id: string) {
  const bracket = await obtenerBracket(fase_id);
  return { campeon: bracket.campeon, subcampeon: bracket.subcampeon };
}
