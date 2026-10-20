/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SIMULACIÓN COMPLETA DE TORNEO DE BILLAR 3 BANDAS');
  console.log('═══════════════════════════════════════════════════════\n');

  // PASO 1: Usuarios
  console.log('PASO 1: Creando usuarios...');
  const hash = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'sim_admin@billar.com' },
    update: {},
    create: { nombre: 'Admin Sim', email: 'sim_admin@billar.com', password_hash: hash, rol: 'admin' },
  });
  const juezUser = await prisma.usuario.upsert({
    where: { email: 'sim_juez@billar.com' },
    update: {},
    create: { nombre: 'Juez Sim', email: 'sim_juez@billar.com', password_hash: hash, rol: 'juez' },
  });
  console.log(`  ✅ Admin: ${admin.email}\n  ✅ Juez: ${juezUser.email}\n`);

  // PASO 2: 9 jugadores
  console.log('PASO 2: Creando 9 jugadores...');
  const jData = [
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

  const jugadores: any[] = [];
  for (const d of jData) {
    const nc = `${d.nombre} ${d.apellido}`;
    const j = await prisma.jugador.upsert({
      where: { nombre_completo: nc },
      update: {},
      create: { ...d, nombre_completo: nc },
    });
    jugadores.push(j);
    console.log(`  ✅ ${nc} — ${d.club_ciudad}`);
  }
  console.log('');

  // PASO 3: Torneo
  console.log('PASO 3: Creando torneo...');
  const torneo = await prisma.torneo.create({
    data: {
      nombre: 'Torneo Simulación',
      descripcion: 'Generado automáticamente',
      fecha_inicio: new Date(),
      fecha_fin: new Date(Date.now() + 7 * 86400000),
      sede: 'Billar Central',
      incremento: 0.30,
      estado: 'activo',
    },
  });
  console.log(`  ✅ ${torneo.nombre}\n`);

  // PASO 4: Fase de grupos
  console.log('PASO 4: Fase de grupos...');
  const faseG = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'grupos', fecha: new Date(), orden: 1 },
  });

  // PASO 5: 3 grupos
  console.log('PASO 5: Creando 3 grupos...');
  const gruposDef = [
    { js: [0, 1, 2], letra: 'A' },
    { js: [3, 4, 5], letra: 'B' },
    { js: [6, 7, 8], letra: 'C' },
  ];
  const gruposCreados: any[] = [];
  for (let i = 0; i < gruposDef.length; i++) {
    const g = await prisma.grupo.create({
      data: { fase_id: faseG.id, numero: i + 1, letra: gruposDef[i].letra },
    });
    for (const idx of gruposDef[i].js) {
      await prisma.grupoJugador.create({ data: { grupo_id: g.id, jugador_id: jugadores[idx].id } });
    }
    gruposCreados.push({ ...g, jugadores: gruposDef[i].js.map((idx: number) => jugadores[idx]) });
    console.log(`  ✅ Grupo ${g.letra}: ${gruposDef[i].js.map((idx: number) => jugadores[idx].nombre_completo).join(', ')}`);
  }
  console.log('');

  // PASO 6: Jugar partidas
  console.log('PASO 6: Jugando partidas...');

  async function jugarPartida(jA: any, jB: any, faseId: string, grupoId?: string): Promise<string> {
    const p = await prisma.partida.create({
      data: { fase_id: faseId, grupo_id: grupoId, jugador_a_id: jA.id, jugador_b_id: jB.id, juez_id: juezUser.id, estado: 'en_curso', total_sets: 3 },
    });
    const sets = [];
    for (let s = 1; s <= 3; s++) {
      sets.push(await prisma.set.create({ data: { partida_id: p.id, numero: s } }));
    }

    let sA = 0, sB = 0;
    for (const set of sets) {
      if (sA >= 2 || sB >= 2) break;
      let tA = 0, tB = 0;
      for (let e = 1; e <= 13; e++) {
        const cA = rand(0, 4), cB = rand(0, 4);
        tA += cA; tB += cB;
        await prisma.entradaSet.createMany({
          data: [
            { set_id: set.id, jugador_id: jA.id, numero_entrada: e, carambolas: cA },
            { set_id: set.id, jugador_id: jB.id, numero_entrada: e, carambolas: cB },
          ],
        });
      }
      const gSet = tA >= tB ? jA.id : jB.id;
      await prisma.set.update({ where: { id: set.id }, data: { ganador_id: gSet } });
      if (gSet === jA.id) sA++; else sB++;
    }

    const ganId = sA >= 2 ? jA.id : jB.id;
    await prisma.partida.update({ where: { id: p.id }, data: { ganador_id: ganId, estado: 'finalizada', confirmada: true } });

    // Ranking
    const pFull = await prisma.partida.findUnique({ where: { id: p.id }, include: { sets: { include: { entradas: true } } } });
    for (const jId of [jA.id, jB.id]) {
      let car = 0, ent = 0, sg = 0, sp = 0;
      for (const s of pFull!.sets) {
        if (s.ganador_id === jId) sg++; else if (s.ganador_id) sp++;
        for (const en of s.entradas) { if (en.jugador_id === jId) { car += en.carambolas; ent++; } }
      }
      const gano = ganId === jId;
      const ex = await prisma.ranking.findUnique({ where: { torneo_id_jugador_id: { torneo_id: torneo.id, jugador_id: jId } } });
      if (ex) {
        const nc = ex.carambolas_total + car, ne = ex.entradas_total + ent;
        await prisma.ranking.update({
          where: { id: ex.id },
          data: { puntos: ex.puntos + (gano ? 2 : 0), sets_ganados: ex.sets_ganados + sg, sets_perdidos: ex.sets_perdidos + sp, carambolas_total: nc, entradas_total: ne, promedio: ne > 0 ? Math.round((nc / ne) * 1000) / 1000 : 0 },
        });
      } else {
        await prisma.ranking.create({
          data: { torneo_id: torneo.id, jugador_id: jId, puntos: gano ? 2 : 0, sets_ganados: sg, sets_perdidos: sp, carambolas_total: car, entradas_total: ent, promedio: ent > 0 ? Math.round((car / ent) * 1000) / 1000 : 0 },
        });
      }
    }

    const ganNombre = ganId === jA.id ? jA.nombre_completo : jB.nombre_completo;
    console.log(`  🎱 ${jA.nombre_completo} vs ${jB.nombre_completo} → ${ganNombre} (${sA}-${sB})`);
    return ganId;
  }

  for (const g of gruposCreados) {
    console.log(`\n  --- Grupo ${g.letra} ---`);
    await jugarPartida(g.jugadores[0], g.jugadores[1], faseG.id, g.id);
    await jugarPartida(g.jugadores[0], g.jugadores[2], faseG.id, g.id);
    await jugarPartida(g.jugadores[1], g.jugadores[2], faseG.id, g.id);
  }

  // PASO 7: Tablas
  console.log('\n\nPASO 7: Tablas de posiciones...');
  const clasificados: any[] = [];
  for (const g of gruposCreados) {
    const rs = await prisma.ranking.findMany({
      where: { torneo_id: torneo.id, jugador_id: { in: g.jugadores.map((j: any) => j.id) } },
      include: { jugador: true },
      orderBy: [{ puntos: 'desc' }, { sets_ganados: 'desc' }, { promedio: 'desc' }],
    });
    console.log(`\n  Grupo ${g.letra}:`);
    rs.forEach((r: any, i: number) => {
      console.log(`   ${i + 1}. ${r.jugador.nombre_completo.padEnd(20)} Pts:${r.puntos} SG:${r.sets_ganados} Prom:${r.promedio}${i === 0 ? ' ✓' : ''}`);
    });
    if (rs[0]) clasificados.push(rs[0].jugador);
  }
  console.log(`\n  Clasificados: ${clasificados.map((c: any) => c.nombre_completo).join(', ')}\n`);

  // PASO 8: Bracket
  console.log('PASO 8: Bracket...');
  const faseL = await prisma.fase.create({ data: { torneo_id: torneo.id, tipo: 'llaves', fecha: new Date(), orden: 2 } });

  console.log('  --- Semifinal ---');
  const ganSemi = await jugarPartida(clasificados[1], clasificados[2], faseL.id);
  const ganSemiJ = clasificados.find((c: any) => c.id === ganSemi);

  console.log('  --- FINAL ---');
  const ganFinal = await jugarPartida(clasificados[0], ganSemiJ, faseL.id);
  const campeon = clasificados.find((c: any) => c.id === ganFinal) || ganSemiJ;
  console.log(`\n  🏆 CAMPEÓN: ${campeon.nombre_completo}\n`);

  // PASO 9: Ranking final
  console.log('PASO 9: Ranking final...');
  const allR = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id },
    include: { jugador: true },
    orderBy: [{ puntos: 'desc' }, { sets_ganados: 'desc' }, { promedio: 'desc' }],
  });
  for (let i = 0; i < allR.length; i++) {
    const r = allR[i];
    const pr = Math.round(r.puntos * (1 + torneo.incremento) * 100) / 100;
    await prisma.ranking.update({ where: { id: r.id }, data: { posicion: i + 1, puntos_ranking: pr } });
  }
  const final2 = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id }, include: { jugador: true }, orderBy: { posicion: 'asc' },
  });
  console.log('\n  Pos | Jugador              | Pts | Pts.Rank | Prom.');
  for (const r of final2) {
    console.log(`   ${String(r.posicion).padStart(2)} | ${r.jugador.nombre_completo.padEnd(20)} | ${String(r.puntos).padStart(3)} | ${String(r.puntos_ranking).padStart(8)} | ${r.promedio.toFixed(3)}`);
  }

  // PASO 10: Promedios históricos
  console.log('\n\nPASO 10: Promedios históricos...');
  for (const j of jugadores) {
    const ents = await prisma.entradaSet.findMany({ where: { jugador_id: j.id } });
    const tc = ents.reduce((a: number, e: any) => a + e.carambolas, 0);
    const te = ents.length;
    const prom = te > 0 ? Math.round((tc / te) * 1000) / 1000 : 0;
    await prisma.jugador.update({ where: { id: j.id }, data: { promedio_historico: prom } });
    console.log(`  ✅ ${j.nombre_completo}: ${prom}`);
  }

  // PASO 11: Finalizar
  console.log('\n\nPASO 11: Finalizando torneo...');
  await prisma.torneo.update({ where: { id: torneo.id }, data: { estado: 'finalizado' } });
  console.log('  ✅ Estado: finalizado\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('  SIMULACIÓN COMPLETADA EXITOSAMENTE ✅');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
