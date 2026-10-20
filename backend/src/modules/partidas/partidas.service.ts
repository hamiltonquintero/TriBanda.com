import prisma from '../../config/prisma';
import { recalcularPromedioHistorico } from '../jugadores/jugadores.service';
import { avanzarGanador } from '../bracket/bracket.service';
import { recalcularRankingCompleto } from '../ranking/ranking.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function calcularGanadorSet(set_id: string): Promise<string | null> {
  const set = await prisma.set.findUnique({
    where: { id: set_id },
    include: { entradas: true, partida: true },
  });
  if (!set) return null;

  const { jugador_a_id, jugador_b_id } = set.partida;
  const sumaA = set.entradas.filter((e) => e.jugador_id === jugador_a_id).reduce((acc, e) => acc + e.carambolas, 0);
  const sumaB = set.entradas.filter((e) => e.jugador_id === jugador_b_id).reduce((acc, e) => acc + e.carambolas, 0);
  const ganador_id = sumaA >= sumaB ? jugador_a_id : jugador_b_id;

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

  // Para ganar: mayoría de sets (2 de 3, 1 de 1, 2 de 2)
  const setsParaGanar = Math.ceil(partida.total_sets / 2);

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
    orderBy: { created_at: 'desc' },
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
  return prisma.partida.create({
    data: {
      fase_id: data.fase_id,
      grupo_id: data.grupo_id || undefined,
      jugador_a_id: data.jugador_a_id,
      jugador_b_id: data.jugador_b_id,
      juez_id: data.juez_id || undefined,
      fecha: data.fecha ? new Date(data.fecha) : null,
      hora: data.hora || undefined,
      total_sets: data.total_sets ?? 3,
      meta_a: data.meta_a ?? null,
      meta_b: data.meta_b ?? null,
      estado: 'pendiente',
    },
    include: {
      jugador_a: true, jugador_b: true,
      juez: { select: { id: true, nombre: true, email: true } },
      fase: true,
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
  },
  juez_id?: string
) {
  const partida = await prisma.partida.findUnique({ where: { id } });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'pendiente') throw new Error('La partida ya fue iniciada o finalizada');

  const setsData = Array.from({ length: partida.total_sets }, (_, i) => ({
    partida_id: id, numero: i + 1,
  }));

  const updateData: any = { estado: 'en_curso' };
  if (!partida.juez_id && juez_id) {
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
    prisma.set.createMany({ data: setsData }),
  ]);

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

  if (data.numero_entrada === 13) {
    await calcularGanadorSet(set.id);
    await calcularGanadorPartida(partida_id);
  }

  return obtenerPartida(partida_id);
}

// ─── MARCADOR DIGITAL: +1 / -1 carambola ────────────────────────────────────

export async function marcadorAccion(
  partida_id: string,
  data: { jugador_id: string; accion: 'sumar' | 'restar'; set_numero: number }
) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id }, include: { sets: { include: { entradas: true } } },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'en_curso') throw new Error('La partida no está en curso');

  const set = partida.sets.find((s) => s.numero === data.set_numero);
  if (!set) throw new Error(`Set ${data.set_numero} no encontrado`);

  // Buscar la entrada actual del jugador (la última)
  const entradasJugador = set.entradas
    .filter((e) => e.jugador_id === data.jugador_id)
    .sort((a, b) => b.numero_entrada - a.numero_entrada);

  const entradaActual = entradasJugador[0];

  if (!entradaActual) {
    if (data.accion === 'restar') throw new Error('No hay carambolas para restar');
    await prisma.entradaSet.create({
      data: { set_id: set.id, jugador_id: data.jugador_id, numero_entrada: 1, carambolas: 1 },
    });
  } else {
    const nuevas = data.accion === 'sumar'
      ? entradaActual.carambolas + 1
      : Math.max(0, entradaActual.carambolas - 1);
    await prisma.entradaSet.update({
      where: { id: entradaActual.id },
      data: { carambolas: nuevas },
    });
  }

  // Verificar victoria por handicap (meta de carambolas)
  if (partida.meta_a || partida.meta_b) {
    const allEntradas = await prisma.entradaSet.findMany({ where: { set_id: set.id } });
    const totalA = allEntradas.filter((e) => e.jugador_id === partida.jugador_a_id).reduce((a, e) => a + e.carambolas, 0);
    const totalB = allEntradas.filter((e) => e.jugador_id === partida.jugador_b_id).reduce((a, e) => a + e.carambolas, 0);

    const metaA = partida.meta_a ?? 999;
    const metaB = partida.meta_b ?? 999;

    if (totalA >= metaA || totalB >= metaB) {
      await calcularGanadorSet(set.id);
      await calcularGanadorPartida(partida.id);
    }
  }

  return obtenerMarcador(partida_id);
}

// ─── CAMBIO DE TURNO (nueva entrada) ────────────────────────────────────────

export async function cambioTurno(partida_id: string, set_numero: number) {
  const partida = await prisma.partida.findUnique({
    where: { id: partida_id }, include: { sets: { include: { entradas: true } } },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.estado !== 'en_curso') throw new Error('La partida no está en curso');

  const set = partida.sets.find((s) => s.numero === set_numero);
  if (!set) throw new Error(`Set ${set_numero} no encontrado`);

  // Calcular siguiente número de entrada para cada jugador
  const entradasA = set.entradas.filter((e) => e.jugador_id === partida.jugador_a_id);
  const entradasB = set.entradas.filter((e) => e.jugador_id === partida.jugador_b_id);
  const nextA = entradasA.length + 1;
  const nextB = entradasB.length + 1;

  if (nextA > 13 && nextB > 13) {
    // Set completo — calcular ganador
    await calcularGanadorSet(set.id);
    await calcularGanadorPartida(partida_id);
    return obtenerMarcador(partida_id);
  }

  // Crear nueva entrada con 0 carambolas para ambos jugadores
  const creates = [];
  if (nextA <= 13) {
    creates.push(prisma.entradaSet.create({
      data: { set_id: set.id, jugador_id: partida.jugador_a_id, numero_entrada: nextA, carambolas: 0 },
    }));
  }
  if (nextB <= 13) {
    creates.push(prisma.entradaSet.create({
      data: { set_id: set.id, jugador_id: partida.jugador_b_id, numero_entrada: nextB, carambolas: 0 },
    }));
  }
  await prisma.$transaction(creates);

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

    return {
      numero: set.numero,
      ganador_id: set.ganador_id,
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

export async function confirmarPartida(id: string, usuario_id: string, usuario_rol: string) {
  const partida = await prisma.partida.findUnique({
    where: { id }, include: { fase: { select: { torneo_id: true } } },
  });
  if (!partida) throw new Error('Partida no encontrada');
  if (partida.confirmada && partida.bloqueada) throw new Error('La partida ya fue confirmada');
  if (partida.estado !== 'finalizada') throw new Error('La partida no está finalizada');

  if (usuario_rol !== 'admin' && partida.juez_id && partida.juez_id !== usuario_id) {
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
  try { await avanzarGanador(id); } catch { /* no es partida de bracket */ }

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

  const partidaActualizada = await prisma.partida.update({
    where: { id },
    data: {
      confirmada: false,
      bloqueada: false,
      solicitud_reapertura: false,
      motivo_reapertura: null,
      estado: 'en_curso',
      audit_log: currentAudit,
    },
  });

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
      numero: set.numero, ganador_id: set.ganador_id, ganador: set.ganador, filas,
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

export async function asignarJuez(partida_id: string, juez_id?: string | null) {
  return prisma.partida.update({
    where: { id: partida_id },
    data: { juez_id: juez_id || null },
    include: {
      juez: { select: { id: true, nombre: true, email: true } },
    },
  });
}

