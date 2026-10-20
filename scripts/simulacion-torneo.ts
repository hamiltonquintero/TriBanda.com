/**
 * SIMULACIÓN COMPLETA DE UN TORNEO DE BILLAR A 3 BANDAS
 * Ejecutar: npx ts-node scripts/simulacion-torneo.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SIMULACIÓN COMPLETA DE TORNEO DE BILLAR 3 BANDAS');
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── PASO 1: Crear usuarios ────────────────────────────────────────────────
  console.log('PASO 1: Creando usuarios...');
  const hash = await bcrypt.hash('admin1234', 12);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@simulacion.com' },
    update: {},
    create: { nombre: 'Admin Simulación', email: 'admin@simulacion.com', password_hash: hash, rol: 'admin' },
  });

  const juez = await prisma.usuario.upsert({
    where: { email: 'juez@simulacion.com' },
    update: {},
    create: { nombre: 'Juez Principal', email: 'juez@simulacion.com', password_hash: hash, rol: 'juez' },
  });
  console.log(`  ✅ Admin: ${admin.email}`);
  console.log(`  ✅ Juez: ${juez.email}\n`);

  // ─── PASO 2: Crear 9 jugadores ────────────────────────────────────────────
  console.log('PASO 2: Creando 9 jugadores...');
  const jugadoresData = [
    { nombre: 'Jorge', apellido: 'Cumbal', club_ciudad: 'Team Guancha', categoria: 'A' },
    { nombre: 'Cristian', apellido: 'Guancha', club_ciudad: 'Team Guancha', categoria: 'A' },
    { nombre: 'Edgar', apellido: 'Pazmiño', club_ciudad: 'Club Roma', categoria: 'A' },
    { nombre: 'Gabriel', apellido: 'Ortiz', club_ciudad: 'La Oficina', categoria: 'B' },
    { nombre: 'Jhon', apellido: 'Quenguan', club_ciudad: 'La Oficina', categoria: 'B' },
    { nombre: 'Edwin', apellido: 'Lopez', club_ciudad: 'Team Guancha', categoria: 'B' },
    { nombre: 'Miguel', apellido: 'Bedoya', club_ciudad: 'Zona 30', categoria: 'C' },
    { nombre: 'Jhon', apellido: 'Acosta', club_ciudad: 'La Oficina', categoria: 'C' },
    { nombre: 'Juancho', apellido: 'Pazmiño', club_ciudad: 'Club Roma', categoria: 'C' },
  ];

  const jugadores = [];
  for (const jd of jugadoresData) {
    const nc = `${jd.nombre} ${jd.apellido}`;
    const j = await prisma.jugador.upsert({
      where: { nombre_completo: nc },
      update: {},
      create: { ...jd, nombre_completo: nc },
    });
    jugadores.push(j);
    console.log(`  ✅ ${j.nombre_completo} — ${j.club_ciudad} (${j.categoria})`);
  }
  console.log('');

  // ─── PASO 3: Crear torneo ─────────────────────────────────────────────────
  console.log('PASO 3: Creando torneo...');
  const torneo = await prisma.torneo.create({
    data: {
      nombre: 'Torneo Simulación',
      descripcion: 'Torneo de prueba generado automáticamente',
      fecha_inicio: new Date(),
      fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sede: 'Billar Central',
      incremento: 0.30,
      estado: 'activo',
    },
  });
  console.log(`  ✅ Torneo: ${torneo.nombre} (incremento: 30%)\n`);

  // ─── PASO 4: Crear fase de grupos ─────────────────────────────────────────
  console.log('PASO 4: Creando fase de grupos...');
  const faseGrupos = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'grupos', fecha: new Date(), orden: 1 },
  });
  console.log(`  ✅ Fase de grupos creada\n`);

  // ─── PASO 5: Crear 3 grupos de 3 jugadores ────────────────────────────────
  console.log('PASO 5: Creando grupos y asignando jugadores...');
  const gruposData = [
    { jugadores: [jugadores[0], jugadores[1], jugadores[2]], letra: 'A' },
    { jugadores: [jugadores[3], jugadores[4], jugadores[5]], letra: 'B' },
    { jugadores: [jugadores[6], jugadores[7], jugadores[8]], letra: 'C' },
  ];

  const grupos = [];
  for (let i = 0; i < gruposData.length; i++) {
    const g = await prisma.grupo.create({
      data: { fase_id: faseGrupos.id, numero: i + 1, letra: gruposData[i].letra },
    });
    for (const j of gruposData[i].jugadores) {
      await prisma.grupoJugador.create({ data: { grupo_id: g.id, jugador_id: j.id } });
    }
    grupos.push({ ...g, jugadores: gruposData[i].jugadores });
    console.log(`  ✅ Grupo ${g.numero} (${g.letra}): ${gruposData[i].jugadores.map(j => j.nombre_completo).join(', ')}`);
  }
  console.log('');

  // ─── PASO 6: Crear y jugar partidas de fase de grupos ─────────────────────
  console.log('PASO 6: Jugando partidas de fase de grupos...');

  async function jugarPartida(jugadorA: any, jugadorB: any, faseId: string, grupoId?: string) {
    // Crear partida
    const partida = await prisma.partida.create({
      data: {
        fase_id: faseId,
        grupo_id: grupoId,
        jugador_a_id: jugadorA.id,
        jugador_b_id: jugadorB.id,
        juez_id: juez.id,
        estado: 'en_curso',
        total_sets: 3,
      },
    });

    // Crear 3 sets
    const sets = [];
    for (let s = 1; s <= 3; s++) {
      const set = await prisma.set.create({ data: { partida_id: partida.id, numero: s } });
      sets.push(set);
    }

    let setsGanadosA = 0;
    let setsGanadosB = 0;

    for (const set of sets) {
      if (setsGanadosA >= 2 || setsGanadosB >= 2) break;

      let totalA = 0, totalB = 0;
      for (let entrada = 1; entrada <= 13; entrada++) {
        const carA = rand(0, 4);
        const carB = rand(0, 4);
        totalA += carA;
        totalB += carB;

        await prisma.entradaSet.createMany({
          data: [
            { set_id: set.id, jugador_id: jugadorA.id, numero_entrada: entrada, carambolas: carA },
            { set_id: set.id, jugador_id: jugadorB.id, numero_entrada: entrada, carambolas: carB },
          ],
        });
      }

      const ganadorSet = totalA >= totalB ? jugadorA.id : jugadorB.id;
      await prisma.set.update({ where: { id: set.id }, data: { ganador_id: ganadorSet } });

      if (ganadorSet === jugadorA.id) setsGanadosA++;
      else setsGanadosB++;
    }

    const ganadorPartida = setsGanadosA >= 2 ? jugadorA.id : jugadorB.id;
    await prisma.partida.update({
      where: { id: partida.id },
      data: { ganador_id: ganadorPartida, estado: 'finalizada', confirmada: true },
    });

    // Actualizar ranking
    const partidaCompleta = await prisma.partida.findUnique({
      where: { id: partida.id },
      include: { sets: { include: { entradas: true } } },
    });

    for (const jId of [jugadorA.id, jugadorB.id]) {
      let car = 0, ent = 0, sg = 0, sp = 0;
      for (const s of partidaCompleta!.sets) {
        if (s.ganador_id === jId) sg++; else if (s.ganador_id) sp++;
        for (const e of s.entradas) {
          if (e.jugador_id === jId) { car += e.carambolas; ent++; }
        }
      }
      const gano = ganadorPartida === jId;

      const existing = await prisma.ranking.findUnique({
        where: { torneo_id_jugador_id: { torneo_id: torneo.id, jugador_id: jId } },
      });
      if (existing) {
        const nc = existing.carambolas_total + car;
        const ne = existing.entradas_total + ent;
        await prisma.ranking.update({
          where: { torneo_id_jugador_id: { torneo_id: torneo.id, jugador_id: jId } },
          data: {
            puntos: existing.puntos + (gano ? 2 : 0),
            sets_ganados: existing.sets_ganados + sg,
            sets_perdidos: existing.sets_perdidos + sp,
            carambolas_total: nc, entradas_total: ne,
            promedio: ne > 0 ? Math.round((nc / ne) * 1000) / 1000 : 0,
          },
        });
      } else {
        await prisma.ranking.create({
          data: {
            torneo_id: torneo.id, jugador_id: jId,
            puntos: gano ? 2 : 0, sets_ganados: sg, sets_perdidos: sp,
            carambolas_total: car, entradas_total: ent,
            promedio: ent > 0 ? Math.round((car / ent) * 1000) / 1000 : 0,
          },
        });
      }
    }

    const ganadorNombre = ganadorPartida === jugadorA.id ? jugadorA.nombre_completo : jugadorB.nombre_completo;
    console.log(`  🎱 ${jugadorA.nombre_completo} vs ${jugadorB.nombre_completo} → Ganador: ${ganadorNombre} (${setsGanadosA}-${setsGanadosB})`);

    return { partida, ganador_id: ganadorPartida };
  }

  // Jugar todas las partidas de cada grupo (round-robin)
  for (const grupo of grupos) {
    const js = grupo.jugadores;
    console.log(`\n  --- Grupo ${grupo.letra} ---`);
    await jugarPartida(js[0], js[1], faseGrupos.id, grupo.id);
    await jugarPartida(js[0], js[2], faseGrupos.id, grupo.id);
    await jugarPartida(js[1], js[2], faseGrupos.id, grupo.id);
  }
  console.log('');

  // ─── PASO 7: Verificar tablas de posiciones ───────────────────────────────
  console.log('PASO 7: Tablas de posiciones por grupo...');
  const clasificados = [];

  for (const grupo of grupos) {
    const rankings = await prisma.ranking.findMany({
      where: {
        torneo_id: torneo.id,
        jugador_id: { in: grupo.jugadores.map(j => j.id) },
      },
      include: { jugador: true },
      orderBy: [{ puntos: 'desc' }, { sets_ganados: 'desc' }, { promedio: 'desc' }],
    });

    console.log(`\n  --- Grupo ${grupo.letra} ---`);
    console.log('  Pos | Jugador              | Pts | S.G. | S.P. | Prom.');
    console.log('  ----|----------------------|-----|------|------|------');
    rankings.forEach((r, i) => {
      const marca = i === 0 ? ' ✓' : '';
      console.log(`   ${i + 1}  | ${r.jugador.nombre_completo.padEnd(20)} | ${String(r.puntos).padStart(3)} | ${String(r.sets_ganados).padStart(4)} | ${String(r.sets_perdidos).padStart(4)} | ${r.promedio.toFixed(3)}${marca}`);
    });

    if (rankings[0]) {
      clasificados.push(rankings[0].jugador);
    }
  }
  console.log(`\n  Clasificados: ${clasificados.map(c => c.nombre_completo).join(', ')}\n`);

  // ─── PASO 8: Fase de bracket (semifinal + final) ──────────────────────────
  console.log('PASO 8: Fase de bracket...');

  // Con 3 clasificados: semifinal (2 juegan) + final (ganador vs el que descansa)
  const faseLlaves = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'llaves', fecha: new Date(), orden: 2 },
  });

  // Semifinal: clasificado 2 vs clasificado 3
  console.log('\n  --- Semifinal ---');
  const semi = await jugarPartida(clasificados[1], clasificados[2], faseLlaves.id);
  const ganadorSemi = semi.ganador_id === clasificados[1].id ? clasificados[1] : clasificados[2];

  // Final: clasificado 1 (descansó) vs ganador semifinal
  console.log('\n  --- FINAL ---');
  const final_ = await jugarPartida(clasificados[0], ganadorSemi, faseLlaves.id);
  const campeon = final_.ganador_id === clasificados[0].id ? clasificados[0] : ganadorSemi;
  const subcampeon = campeon.id === clasificados[0].id ? ganadorSemi : clasificados[0];

  console.log(`\n  🏆 CAMPEÓN: ${campeon.nombre_completo}`);
  console.log(`  🥈 Subcampeón: ${subcampeon.nombre_completo}\n`);

  // ─── PASO 9: Ranking final ────────────────────────────────────────────────
  console.log('PASO 9: Ranking final del torneo...');

  // Aplicar puntos de ranking con incremento
  const allRankings = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id },
    include: { jugador: true },
    orderBy: [{ puntos: 'desc' }, { sets_ganados: 'desc' }, { promedio: 'desc' }],
  });

  for (let i = 0; i < allRankings.length; i++) {
    const r = allRankings[i];
    const puntosRanking = Math.round(r.puntos * (1 + torneo.incremento) * 100) / 100;
    await prisma.ranking.update({
      where: { id: r.id },
      data: { posicion: i + 1, puntos_ranking: puntosRanking },
    });
  }

  const rankingFinal = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id },
    include: { jugador: true },
    orderBy: { posicion: 'asc' },
  });

  console.log('\n  Pos | Jugador              | Club           | Pts | Pts.Rank | Prom.');
  console.log('  ----|----------------------|----------------|-----|----------|------');
  for (const r of rankingFinal) {
    console.log(`   ${String(r.posicion).padStart(2)} | ${r.jugador.nombre_completo.padEnd(20)} | ${r.jugador.club_ciudad.padEnd(14)} | ${String(r.puntos).padStart(3)} | ${String(r.puntos_ranking).padStart(8)} | ${r.promedio.toFixed(3)}`);
  }

  // ─── PASO 10: Actualizar promedios históricos ─────────────────────────────
  console.log('\n\nPASO 10: Actualizando promedios históricos...');
  for (const j of jugadores) {
    const entradas = await prisma.entradaSet.findMany({ where: { jugador_id: j.id } });
    const totalCar = entradas.reduce((a, e) => a + e.carambolas, 0);
    const totalEnt = entradas.length;
    const prom = totalEnt > 0 ? Math.round((totalCar / totalEnt) * 1000) / 1000 : 0;
    await prisma.jugador.update({ where: { id: j.id }, data: { promedio_historico: prom } });
    console.log(`  ✅ ${j.nombre_completo}: promedio histórico = ${prom}`);
  }

  // ─── PASO 11: Finalizar torneo ────────────────────────────────────────────
  console.log('\n\nPASO 11: Finalizando torneo...');
  await prisma.torneo.update({ where: { id: torneo.id }, data: { estado: 'finalizado' } });
  console.log('  ✅ Torneo finalizado — estado: finalizado');

  // Verificar que no se puede editar
  try {
    await prisma.torneo.findUnique({ where: { id: torneo.id } });
    console.log('  ✅ Torneo en modo solo lectura\n');
  } catch {
    console.log('  ❌ Error al verificar estado\n');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  SIMULACIÓN COMPLETADA EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => { console.error('❌ Error en simulación:', e); })
  .finally(() => prisma.$disconnect());
