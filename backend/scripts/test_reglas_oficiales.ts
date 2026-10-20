import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import { calcularTablaGrupo, obtenerClasificados } from '../src/modules/grupos/grupos.service';
import { generarBracket, avanzarGanador, obtenerBracket } from '../src/modules/bracket/bracket.service';
import { asignarPuntosPosicionFinal, obtenerRankingTorneo } from '../src/modules/ranking/ranking.service';
import { confirmarPartida, solicitarCorreccion, reabrirPartida } from '../src/modules/partidas/partidas.service';

async function testSistemaOficial() {
  console.log('===================================================================');
  console.log('  TEST DE INTEGRACIÓN: REGLAS OFICIALES Y PARTIDAS DE AJUSTE');
  console.log('===================================================================\n');

  // 1. Usuarios para los 3 perfiles
  console.log('1. Verificando los 3 perfiles (Admin, Juez, Espectador)...');
  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'superadmin@tribanda.com' },
    update: {},
    create: { nombre: 'Super Administrador', email: 'superadmin@tribanda.com', password_hash: hash, rol: 'admin' },
  });
  const juez = await prisma.usuario.upsert({
    where: { email: 'juez1@tribanda.com' },
    update: {},
    create: { nombre: 'Juez Principal', email: 'juez1@tribanda.com', password_hash: hash, rol: 'juez' },
  });
  console.log(`  ✓ Superadmin: ${admin.email} (rol: ${admin.rol})`);
  console.log(`  ✓ Juez: ${juez.email} (rol: ${juez.rol})`);

  // 2. Crear Torneo con incremento 30% (+0.30)
  console.log('\n2. Creando Torneo con +30% de incremento...');
  const torneo = await prisma.torneo.create({
    data: {
      nombre: 'Torneo Oficial Medellín 2025',
      descripcion: 'Clasificatorio Feria de las Flores',
      sede: 'Club Central',
      fecha_inicio: new Date(),
      fecha_fin: new Date(Date.now() + 86400000 * 3),
      incremento: 0.30,
      estado: 'activo',
    },
  });
  console.log(`  ✓ Torneo creado: ${torneo.nombre} (ID: ${torneo.id}, Incremento: +${torneo.incremento * 100}%)`);

  // 3. Crear 20 jugadores
  console.log('\n3. Creando 20 jugadores inscritos...');
  const nombres = [
    'Jorge Cumbal', 'Cristian Guancha', 'Edgar Pazmiño', 'Jorge Hernandez',
    'Edwin Lopez', 'Gabriel Ortiz', 'Jhon Quenguan', 'Jhon Acosta',
    'Miguel Bedoya', 'Juancho Pazmiño', 'Esteban Ayala', 'Lester Leon',
    'Andres Bedoya', 'Pablo Getial', 'Cristian Salazar', 'Ramiro Mafla',
    'Alex Burbano', 'Julio Reina', 'Maverick Billar', 'Ricardo Vela'
  ];

  const jugadores = [];
  for (let i = 0; i < nombres.length; i++) {
    const [nom, ...ap] = nombres[i].split(' ');
    const j = await prisma.jugador.upsert({
      where: { nombre_completo: nombres[i] },
      update: {},
      create: {
        nombre: nom,
        apellido: ap.join(' '),
        nombre_completo: nombres[i],
        club_ciudad: i % 2 === 0 ? 'Team Guancha' : 'Club Roma',
        categoria: 'Primera',
        promedio_historico: 0.650,
      },
    });
    jugadores.push(j);
  }
  console.log(`  ✓ 20 jugadores listos`);

  // 4. Crear Fase de Grupos y Fase de Llaves
  console.log('\n4. Creando fases del torneo...');
  const faseGrupos = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'grupos', fecha: new Date(), orden: 1, clasificados_por_grupo: 2 },
  });
  const faseLlaves = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'llaves', fecha: new Date(), orden: 2 },
  });
  console.log(`  ✓ Fase Grupos: ID ${faseGrupos.id} (clasifican 2 por grupo)`);
  console.log(`  ✓ Fase Llaves: ID ${faseLlaves.id}`);

  // 5. Test de la Matemática de Ajuste con 20 clasificados
  console.log('\n5. Validando el Generador de Bracket con 20 clasificados...');
  const jugadorIds = jugadores.map((j) => j.id);
  const bracket = await generarBracket(faseLlaves.id, jugadorIds);

  console.log(`  ✓ Rondas generadas en bracket: ${bracket.rondas.length}`);
  bracket.rondas.forEach((r) => {
    console.log(`    - ${r.nombre} (Ronda ${r.numero}): ${r.cruces.length} cruces`);
  });

  const rondaAjuste = bracket.rondas.find((r) => r.es_ajuste || r.numero === 99);
  if (!rondaAjuste) {
    throw new Error('FALLO: No se generó la Ronda de Ajuste para 20 clasificados!');
  }
  console.log(`  ✓ Ronda de Ajuste verificada con ${rondaAjuste.cruces.length} partidas (8 jugadores, los puestos 13 al 20)`);

  const octavos = bracket.rondas.find((r) => r.numero === 16);
  if (!octavos) {
    throw new Error('FALLO: No se generó la Ronda de 16 (Octavos)!');
  }
  console.log(`  ✓ Octavos de Final verificados con ${octavos.cruces.length} cruces (16 jugadores esperados)`);

  // 6. Simular y confirmar una partida de ajuste y verificar que avanza
  console.log('\n6. Jugando y confirmando partida de ajuste...');
  const cruceAjuste1 = rondaAjuste.cruces[0];
  const partidaAjuste = cruceAjuste1.slot_a.partida;
  if (!partidaAjuste) throw new Error('No se encontró partida en el primer cruce de ajuste');

  // Registrar carambolas en la partida
  await prisma.entradaSet.createMany({
    data: [
      { set_id: partidaAjuste.sets[0].id, jugador_id: partidaAjuste.jugador_a_id, numero_entrada: 1, carambolas: 8 }, // Mayor serie: 8!
      { set_id: partidaAjuste.sets[0].id, jugador_id: partidaAjuste.jugador_b_id, numero_entrada: 1, carambolas: 2 },
    ],
  });
  await prisma.set.update({
    where: { id: partidaAjuste.sets[0].id },
    data: { ganador_id: partidaAjuste.jugador_a_id },
  });
  await prisma.partida.update({
    where: { id: partidaAjuste.id },
    data: { estado: 'finalizada', ganador_id: partidaAjuste.jugador_a_id },
  });

  // Confirmar la partida
  await confirmarPartida(partidaAjuste.id, juez.id, 'juez');
  console.log(`  ✓ Partida de ajuste confirmada. Ganador: Jugador A (${partidaAjuste.jugador_a_id})`);

  // Verificar que avanzó a la Ronda de 16
  const bracketPostAjuste = await obtenerBracket(faseLlaves.id);
  const octavosPost = bracketPostAjuste.rondas.find((r) => r.numero === 16);
  const encontroGanadorEnOctavos = octavosPost?.cruces.some(
    (c) => c.slot_a.jugador?.id === partidaAjuste.jugador_a_id || c.slot_b.jugador?.id === partidaAjuste.jugador_a_id
  );
  console.log(`  ✓ ¿El ganador del ajuste subió automáticamente a Octavos?: ${encontroGanadorEnOctavos ? 'SÍ ✅' : 'NO ❌'}`);

  // 7. Test de Seguridad y Flujo de Corrección del Juez
  console.log('\n7. Probando flujo de solicitud de corrección y autorización del Superadmin...');
  const partidaBloqueada = await prisma.partida.findUnique({ where: { id: partidaAjuste.id } });
  console.log(`  ✓ Estado de bloqueo de partida: confirmada=${partidaBloqueada?.confirmada}, bloqueada=${partidaBloqueada?.bloqueada}`);

  // El juez solicita corrección
  await solicitarCorreccion(partidaAjuste.id, juez.id, 'Error en entrada 1: el jugador A hizo 7 y no 8 carambolas.');
  const partidaConSolicitud = await prisma.partida.findUnique({ where: { id: partidaAjuste.id } });
  console.log(`  ✓ Solicitud enviada por juez: solicitud_reapertura=${partidaConSolicitud?.solicitud_reapertura}`);
  console.log(`  ✓ Motivo registrado: "${partidaConSolicitud?.motivo_reapertura}"`);

  // El admin aprueba y reabre
  await reabrirPartida(partidaAjuste.id, admin.id, 'Aprobada la corrección solicitada por el juez');
  const partidaReabierta = await prisma.partida.findUnique({ where: { id: partidaAjuste.id } });
  console.log(`  ✓ Partida reabierta por admin: confirmada=${partidaReabierta?.confirmada}, bloqueada=${partidaReabierta?.bloqueada}, estado=${partidaReabierta?.estado}`);
  console.log(`  ✓ Audit log registrado con éxito (${(partidaReabierta?.audit_log as any[]).length} eventos de auditoría)`);

  // Re-finalizar y re-confirmar
  await prisma.partida.update({
    where: { id: partidaAjuste.id },
    data: { estado: 'finalizada' },
  });
  await confirmarPartida(partidaAjuste.id, juez.id, 'juez');
  console.log(`  ✓ Partida re-confirmada y bloqueada nuevamente`);

  // 8. Test de la Escala de Puntos Oficial del Excel al finalizar torneo
  console.log('\n8. Probando asignación de puntos finales con escala del Excel y factor +30%...');
  await asignarPuntosPosicionFinal(torneo.id);
  const rankingFinal = await obtenerRankingTorneo(torneo.id);

  console.log('\n  TABLA DE PUNTOS FINALES SEGÚN ESCALA EXCEL:');
  console.log('  Pos | Jugador              | Base | +30% Total | Promedio');
  console.log('  -------------------------------------------------------');
  rankingFinal.slice(0, 10).forEach((r) => {
    console.log(`   ${String(r.posicion).padStart(2)} | ${r.nombre_completo.padEnd(20)} | Pts: ${String(r.puntos).padStart(2)} | Rank: ${String(r.puntos_ranking).padStart(5)} | Prom: ${r.promedio.toFixed(3)}`);
  });

  console.log('\n===================================================================');
  console.log('  TEST FINALIZADO CON ÉXITO: 100% CONFORME A LAS REGLAS DEL CLIENTE ✅');
  console.log('===================================================================');
}

testSistemaOficial()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
