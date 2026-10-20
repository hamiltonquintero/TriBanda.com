/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🏆 AGREGANDO BRACKET AL TORNEO DE 168 JUGADORES\n');

  const torneo = await prisma.torneo.findFirst({ where: { nombre: 'Gran Copa TriBanda 168' } });
  if (!torneo) { console.log('❌ Torneo no encontrado'); return; }
  console.log(`✅ Torneo: ${torneo.nombre}\n`);

  // Obtener fase de grupos
  const faseGrupos = await prisma.fase.findFirst({ where: { torneo_id: torneo.id, tipo: 'grupos' } });
  if (!faseGrupos) { console.log('❌ Fase de grupos no encontrada'); return; }

  // Obtener clasificados (1° de cada grupo = 56 clasificados)
  const grupos = await prisma.grupo.findMany({
    where: { fase_id: faseGrupos.id },
    include: { jugadores: { include: { jugador: true } } },
    orderBy: { numero: 'asc' },
  });

  // Obtener el 1° de cada grupo por ranking
  const clasificados: any[] = [];
  for (const g of grupos) {
    const jugadorIds = g.jugadores.map(gj => gj.jugador_id);
    const rankings = await prisma.ranking.findMany({
      where: { torneo_id: torneo.id, jugador_id: { in: jugadorIds } },
      include: { jugador: true },
      orderBy: [{ puntos: 'desc' }, { sets_ganados: 'desc' }, { promedio: 'desc' }],
    });
    if (rankings[0]) {
      clasificados.push(rankings[0].jugador);
    }
  }

  console.log(`📋 ${clasificados.length} clasificados de ${grupos.length} grupos`);

  // Para un bracket de 64, necesitamos 64 jugadores. Tomamos los 56 clasificados
  // y el bracket será de 64 (siguiente potencia de 2)
  // Los 8 slots vacíos serán "byes" (pasan automáticamente)

  // Crear fase de llaves
  const faseLlaves = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'llaves', fecha: new Date(), orden: 2 },
  });
  console.log('✅ Fase de llaves creada\n');

  // Generar bracket de 64
  const tamano = 64;
  function buildSeedOrder(n: number): number[] {
    if (n === 1) return [1];
    const prev = buildSeedOrder(n / 2);
    const result: number[] = [];
    for (const s of prev) { result.push(s); result.push(n + 1 - s); }
    return result;
  }

  const semillas = buildSeedOrder(tamano);
  const slotsData = [];

  // Ronda inicial (64 slots)
  for (let i = 0; i < tamano; i++) {
    const semilla = semillas[i];
    const jugador_id = semilla <= clasificados.length ? clasificados[semilla - 1].id : null;
    slotsData.push({ fase_id: faseLlaves.id, ronda: tamano, posicion: i + 1, jugador_id });
  }

  // Rondas siguientes (vacías)
  let ronda = tamano / 2;
  while (ronda >= 1) {
    for (let i = 0; i < ronda * 2; i++) {
      slotsData.push({ fase_id: faseLlaves.id, ronda, posicion: i + 1, jugador_id: null });
    }
    ronda = Math.floor(ronda / 2);
  }

  await prisma.bracketSlot.createMany({ data: slotsData });
  console.log(`✅ Bracket de ${tamano} generado (${clasificados.length} jugadores + ${tamano - clasificados.length} byes)\n`);

  // Jugar las partidas del bracket ronda por ronda
  const juez = await prisma.usuario.findFirst({ where: { rol: 'juez' } });
  if (!juez) { console.log('❌ No hay juez'); return; }

  let rondaActual = tamano;
  while (rondaActual >= 2) {
    const nombreRonda: Record<number, string> = { 2: 'Final', 4: 'Semifinales', 8: 'Cuartos', 16: 'Octavos', 32: 'Dieciseisavos', 64: 'Ronda de 64' };
    console.log(`\n🎱 ${nombreRonda[rondaActual] ?? `Ronda de ${rondaActual}`}`);

    const slots = await prisma.bracketSlot.findMany({
      where: { fase_id: faseLlaves.id, ronda: rondaActual },
      include: { jugador: true },
      orderBy: { posicion: 'asc' },
    });

    // Emparejar slots (1-2, 3-4, 5-6...)
    for (let i = 0; i < slots.length; i += 2) {
      const slotA = slots[i];
      const slotB = slots[i + 1];
      if (!slotA || !slotB) continue;

      const jA = slotA.jugador;
      const jB = slotB.jugador;

      // Si uno es bye (null), el otro avanza automáticamente
      if (!jA && !jB) continue;

      if (!jA && jB) {
        // jB avanza
        const rondaSig = Math.floor(rondaActual / 2);
        const posSig = Math.ceil((i / 2) + 1);
        const posSlot = (i / 2) % 2 === 0 ? posSig * 2 - 1 : posSig * 2;
        await prisma.bracketSlot.updateMany({
          where: { fase_id: faseLlaves.id, ronda: rondaSig, posicion: posSlot },
          data: { jugador_id: jB.id },
        });
        console.log(`   BYE → ${jB.nombre_completo} avanza`);
        continue;
      }

      if (jA && !jB) {
        const rondaSig = Math.floor(rondaActual / 2);
        const posSig = Math.ceil((i / 2) + 1);
        const posSlot = (i / 2) % 2 === 0 ? posSig * 2 - 1 : posSig * 2;
        await prisma.bracketSlot.updateMany({
          where: { fase_id: faseLlaves.id, ronda: rondaSig, posicion: posSlot },
          data: { jugador_id: jA.id },
        });
        console.log(`   ${jA.nombre_completo} avanza ← BYE`);
        continue;
      }

      // Ambos jugadores presentes — jugar partida
      const p = await prisma.partida.create({
        data: { fase_id: faseLlaves.id, jugador_a_id: jA!.id, jugador_b_id: jB!.id, juez_id: juez.id, estado: 'en_curso', total_sets: 3 },
      });

      // Actualizar slots con partida_id
      await prisma.bracketSlot.update({ where: { id: slotA.id }, data: { partida_id: p.id } });
      await prisma.bracketSlot.update({ where: { id: slotB.id }, data: { partida_id: p.id } });

      const sets = [];
      for (let s = 1; s <= 3; s++) sets.push(await prisma.set.create({ data: { partida_id: p.id, numero: s } }));

      let sA = 0, sB = 0;
      for (const set of sets) {
        if (sA >= 2 || sB >= 2) break;
        let tA = 0, tB = 0;
        const entradas = [];
        for (let e = 1; e <= 13; e++) {
          const cA = rand(0, 4), cB = rand(0, 4);
          tA += cA; tB += cB;
          entradas.push(
            { set_id: set.id, jugador_id: jA!.id, numero_entrada: e, carambolas: cA },
            { set_id: set.id, jugador_id: jB!.id, numero_entrada: e, carambolas: cB },
          );
        }
        await prisma.entradaSet.createMany({ data: entradas });
        const gSet = tA >= tB ? jA!.id : jB!.id;
        await prisma.set.update({ where: { id: set.id }, data: { ganador_id: gSet } });
        if (gSet === jA!.id) sA++; else sB++;
      }

      const ganId = sA >= 2 ? jA!.id : jB!.id;
      await prisma.partida.update({ where: { id: p.id }, data: { ganador_id: ganId, estado: 'finalizada', confirmada: true } });

      // Avanzar ganador al siguiente slot
      const rondaSig = Math.floor(rondaActual / 2);
      if (rondaSig >= 1) {
        const cruceIdx = Math.floor(i / 2);
        const posSlot = cruceIdx % 2 === 0 ? (Math.floor(cruceIdx / 2) + 1) * 2 - 1 : (Math.floor(cruceIdx / 2) + 1) * 2;
        await prisma.bracketSlot.updateMany({
          where: { fase_id: faseLlaves.id, ronda: rondaSig, posicion: posSlot },
          data: { jugador_id: ganId },
        });
      }

      const ganNombre = ganId === jA!.id ? jA!.nombre_completo : jB!.nombre_completo;
      console.log(`   ${jA!.nombre_completo} vs ${jB!.nombre_completo} → ${ganNombre} (${sA}-${sB})`);
    }

    rondaActual = Math.floor(rondaActual / 2);
  }

  // Determinar campeón
  const finalSlot = await prisma.bracketSlot.findFirst({
    where: { fase_id: faseLlaves.id, ronda: 1 },
    include: { jugador: true },
  });

  console.log(`\n\n🏆🏆🏆 CAMPEÓN: ${finalSlot?.jugador?.nombre_completo ?? 'No determinado'} 🏆🏆🏆\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ BRACKET COMPLETO — Abre http://localhost:5173');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
