/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PRUEBA E2E — Crea datos reales visibles en el frontend
 * Ejecutar: npx ts-node --transpile-only scripts/prueba-frontend.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('\n🎱 CREANDO DATOS DE PRUEBA PARA EL FRONTEND\n');

  // ─── PASO 1: Verificar admin ──────────────────────────────────────────────
  console.log('1️⃣  Verificando usuario admin...');
  const admin = await prisma.usuario.findUnique({ where: { email: 'admin@billar.com' } });
  if (!admin) {
    console.log('   ❌ No existe admin@billar.com. Ejecuta: npm run db:seed');
    return;
  }
  console.log(`   ✅ Admin: ${admin.nombre} (${admin.email})\n`);

  // ─── PASO 2: Crear juez ───────────────────────────────────────────────────
  console.log('2️⃣  Creando usuario juez...');
  const hash = await bcrypt.hash('juez1234', 12);
  const juez = await prisma.usuario.upsert({
    where: { email: 'juez@tribanda.com' },
    update: {},
    create: { nombre: 'Carlos Juez', email: 'juez@tribanda.com', password_hash: hash, rol: 'juez' },
  });
  console.log(`   ✅ Juez: ${juez.nombre} (${juez.email}) — password: juez1234\n`);

  // ─── PASO 3: Crear 9 jugadores ────────────────────────────────────────────
  console.log('3️⃣  Creando 9 jugadores...');
  const jugadoresData = [
    { nombre: 'Jorge', apellido: 'Cumbal', club_ciudad: 'Team Guancha', categoria: 'A', alias: 'El Maestro' },
    { nombre: 'Cristian', apellido: 'Guancha', club_ciudad: 'Team Guancha', categoria: 'A', alias: 'El Zurdo' },
    { nombre: 'Edgar', apellido: 'Pazmiño', club_ciudad: 'Club Roma', categoria: 'A', alias: 'Pacho' },
    { nombre: 'Gabriel', apellido: 'Ortiz', club_ciudad: 'La Oficina', categoria: 'B', alias: 'Gabo' },
    { nombre: 'Jhon', apellido: 'Quenguan', club_ciudad: 'La Oficina', categoria: 'B', alias: 'El Flaco' },
    { nombre: 'Edwin', apellido: 'Lopez', club_ciudad: 'Team Guancha', categoria: 'B', alias: 'Loco' },
    { nombre: 'Miguel', apellido: 'Bedoya', club_ciudad: 'Zona 30', categoria: 'C', alias: 'Migue' },
    { nombre: 'Andres', apellido: 'Acosta', club_ciudad: 'La Oficina', categoria: 'C', alias: 'Andy' },
    { nombre: 'Juancho', apellido: 'Pazmiño', club_ciudad: 'Club Roma', categoria: 'C', alias: 'Juanchi' },
  ];

  const jugadores: any[] = [];
  for (const d of jugadoresData) {
    const nc = `${d.nombre} ${d.apellido}`;
    const j = await prisma.jugador.upsert({
      where: { nombre_completo: nc },
      update: { alias: d.alias, categoria: d.categoria },
      create: { ...d, nombre_completo: nc },
    });
    jugadores.push(j);
    console.log(`   ✅ ${nc} "${d.alias}" — ${d.club_ciudad} (Cat. ${d.categoria})`);
  }

  // ─── PASO 4: Crear torneo ─────────────────────────────────────────────────
  console.log('\n4️⃣  Creando torneo...');
  // Limpiar torneo anterior si existe
  const torneoAnterior = await prisma.torneo.findFirst({ where: { nombre: 'Copa TriBanda 2026' } });
  if (torneoAnterior) {
    await prisma.torneo.delete({ where: { id: torneoAnterior.id } });
    console.log('   🗑️  Torneo anterior eliminado');
  }

  const torneo = await prisma.torneo.create({
    data: {
      nombre: 'Copa TriBanda 2026',
      descripcion: 'Primer torneo oficial de la plataforma TriBanda',
      fecha_inicio: new Date(),
      fecha_fin: new Date(Date.now() + 7 * 86400000),
      sede: 'Billar Central — Pasto',
      incremento: 0.30,
      estado: 'activo',
    },
  });
  console.log(`   ✅ ${torneo.nombre} — Sede: ${torneo.sede} — Incremento: 30%\n`);

  // ─── PASO 5: Fase de grupos ───────────────────────────────────────────────
  console.log('5️⃣  Creando fase de grupos...');
  const faseGrupos = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'grupos', fecha: new Date(), orden: 1 },
  });

  // Crear 3 grupos
  const gruposDef = [
    { js: [0, 1, 2], letra: 'A' },
    { js: [3, 4, 5], letra: 'B' },
    { js: [6, 7, 8], letra: 'C' },
  ];

  const gruposCreados: any[] = [];
  for (let i = 0; i < gruposDef.length; i++) {
    const g = await prisma.grupo.create({
      data: { fase_id: faseGrupos.id, numero: i + 1, letra: gruposDef[i].letra },
    });
    for (const idx of gruposDef[i].js) {
      await prisma.grupoJugador.create({ data: { grupo_id: g.id, jugador_id: jugadores[idx].id } });
    }
    gruposCreados.push({ ...g, jugadores: gruposDef[i].js.map((idx: number) => jugadores[idx]) });
    console.log(`   ✅ Grupo ${g.letra}: ${gruposDef[i].js.map((idx: number) => jugadores[idx].nombre_completo).join(', ')}`);
  }

  // ─── PASO 6: Jugar partidas ───────────────────────────────────────────────
  console.log('\n6️⃣  Jugando partidas de fase de grupos...');

  async function jugarPartida(jA: any, jB: any, faseId: string, grupoId: string): Promise<string> {
    const p = await prisma.partida.create({
      data: { fase_id: faseId, grupo_id: grupoId, jugador_a_id: jA.id, jugador_b_id: jB.id, juez_id: juez.id, estado: 'en_curso', total_sets: 3 },
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
    console.log(`   🎱 ${jA.nombre_completo} vs ${jB.nombre_completo} → ${ganNombre} (${sA}-${sB})`);
    return ganId;
  }

  for (const g of gruposCreados) {
    console.log(`\n   --- Grupo ${g.letra} ---`);
    await jugarPartida(g.jugadores[0], g.jugadores[1], faseGrupos.id, g.id);
    await jugarPartida(g.jugadores[0], g.jugadores[2], faseGrupos.id, g.id);
    await jugarPartida(g.jugadores[1], g.jugadores[2], faseGrupos.id, g.id);
  }

  // ─── PASO 7: Ranking con posiciones ───────────────────────────────────────
  console.log('\n\n7️⃣  Calculando ranking final...');
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

  // Actualizar promedios históricos
  for (const j of jugadores) {
    const ents = await prisma.entradaSet.findMany({ where: { jugador_id: j.id } });
    const tc = ents.reduce((a: number, e: any) => a + e.carambolas, 0);
    const te = ents.length;
    const prom = te > 0 ? Math.round((tc / te) * 1000) / 1000 : 0;
    await prisma.jugador.update({ where: { id: j.id }, data: { promedio_historico: prom } });
  }

  // Mostrar ranking
  const rankFinal = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id }, include: { jugador: true }, orderBy: { posicion: 'asc' },
  });
  console.log('\n   RANKING FINAL:');
  console.log('   Pos | Jugador              | Club           | Pts | Rank  | Prom.');
  for (const r of rankFinal) {
    console.log(`    ${String(r.posicion).padStart(2)} | ${r.jugador.nombre_completo.padEnd(20)} | ${r.jugador.club_ciudad.padEnd(14)} | ${String(r.puntos).padStart(3)} | ${String(r.puntos_ranking).padStart(5)} | ${r.promedio.toFixed(3)}`);
  }

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  ✅ DATOS CREADOS — ABRE EL FRONTEND PARA VERLOS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n  📌 Abre: http://localhost:5173');
  console.log('  📌 Login: admin@billar.com / admin1234');
  console.log('  📌 Juez:  juez@tribanda.com / juez1234');
  console.log(`\n  📌 Torneo: "${torneo.nombre}"`);
  console.log('  📌 9 jugadores con alias, 3 grupos, 9 partidas jugadas');
  console.log('  📌 Ranking calculado con incremento 30%\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
