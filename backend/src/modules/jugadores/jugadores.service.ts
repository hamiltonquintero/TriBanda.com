import prisma from '../../config/prisma';

// ─── CLUBES ──────────────────────────────────────────────────────────────────

export async function listarClubes() {
  return prisma.club.findMany({ orderBy: { nombre: 'asc' } });
}

export async function crearClub(data: { nombre: string; ciudad?: string }) {
  const existe = await prisma.club.findUnique({ where: { nombre: data.nombre } });
  if (existe) throw new Error('Ya existe un club con ese nombre');
  return prisma.club.create({ data });
}

// ─── JUGADORES ───────────────────────────────────────────────────────────────

export async function listarJugadores(filtros?: { club_id?: string; activo?: boolean; buscar?: string }) {
  return prisma.jugador.findMany({
    where: {
      ...(filtros?.club_id && { club_id: filtros.club_id }),
      ...(filtros?.activo !== undefined && { activo: filtros.activo }),
      ...(filtros?.buscar && {
        OR: [
          { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
          { apellido: { contains: filtros.buscar, mode: 'insensitive' } },
          { alias: { contains: filtros.buscar, mode: 'insensitive' } },
          { cedula: { contains: filtros.buscar, mode: 'insensitive' } },
        ],
      }),
    },
    include: { club: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
}

export async function obtenerJugador(id: string) {
  const jugador = await prisma.jugador.findUnique({
    where: { id },
    include: {
      club: true,
      rankings: {
        include: { torneo: true },
        orderBy: { torneo: { fecha_inicio: 'desc' } },
      },
    },
  });
  if (!jugador) throw new Error('Jugador no encontrado');
  return jugador;
}

export async function crearJugador(data: {
  nombre: string;
  apellido: string;
  alias?: string;
  cedula?: string;
  celular?: string;
  ciudad?: string;
  pais?: string;
  club_ciudad: string;
  categoria?: string;
  foto_url?: string;
  club_id?: string;
}) {
  const nombre_completo = `${data.nombre} ${data.apellido}`.trim();

  const existe = await prisma.jugador.findUnique({ where: { nombre_completo } });
  if (existe) throw new Error(`Ya existe un jugador con el nombre "${nombre_completo}"`);

  if (data.cedula) {
    const existeCedula = await prisma.jugador.findUnique({ where: { cedula: data.cedula } });
    if (existeCedula) throw new Error(`Ya existe un jugador con la cédula ${data.cedula}`);
  }

  return prisma.jugador.create({
    data: { ...data, nombre_completo },
    include: { club: true },
  });
}

export async function editarJugador(id: string, data: Partial<{
  nombre: string;
  apellido: string;
  alias: string;
  cedula: string;
  celular: string;
  ciudad: string;
  pais: string;
  club_ciudad: string;
  categoria: string;
  foto_url: string;
  activo: boolean;
  club_id: string;
}>) {
  // Recalcular nombre_completo si cambia nombre o apellido
  let nombre_completo: string | undefined;
  if (data.nombre || data.apellido) {
    const actual = await prisma.jugador.findUnique({ where: { id } });
    if (!actual) throw new Error('Jugador no encontrado');
    const nuevoNombre = data.nombre ?? actual.nombre;
    const nuevoApellido = data.apellido ?? actual.apellido;
    nombre_completo = `${nuevoNombre} ${nuevoApellido}`.trim();
  }

  return prisma.jugador.update({
    where: { id },
    data: { ...data, ...(nombre_completo && { nombre_completo }) },
    include: { club: true },
  });
}

export async function desactivarJugador(id: string) {
  return prisma.jugador.update({ where: { id }, data: { activo: false } });
}

// ─── PROMEDIO HISTÓRICO ───────────────────────────────────────────────────────
// Se llama desde el módulo de partidas al confirmar un resultado

export async function recalcularPromedioHistorico(jugador_id: string) {
  // Suma todas las entradas del jugador en todos los torneos
  const entradas = await prisma.entradaSet.findMany({
    where: { jugador_id },
  });

  const total_carambolas = entradas.reduce((acc, e) => acc + e.carambolas, 0);
  const total_entradas = entradas.length;
  const promedio = total_entradas > 0
    ? Math.round((total_carambolas / total_entradas) * 1000) / 1000
    : 0;

  await prisma.jugador.update({
    where: { id: jugador_id },
    data: { promedio_historico: promedio },
  });

  return promedio;
}
