/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const NOMBRES = ['Carlos','Luis','Miguel','Jorge','Andres','David','Juan','Pedro','Oscar','Diego','Mario','Pablo','Raul','Ivan','Alex','Sergio','Daniel','Felipe','Ricardo','Camilo','Esteban','Fabian','Hector','Manuel','Nelson','Roberto','Santiago','Victor','William','Alberto','Arturo','Bernardo','Cesar','Eduardo','Fernando','Gabriel','Gustavo','Hernan','Jaime','Leonardo','Marcos','Nicolas','Orlando','Rafael','Samuel','Tomas','Ulises','Xavier','Yesid','Armando','Bolivar','Cristobal','Dario','Emilio','Francisco','Gonzalo','Hugo','Ignacio','Joaquin','Kevin','Lorenzo','Mauricio','Norberto','Octavio','Patricio','Ramiro','Sebastian','Teodoro','Valentin','Walter','Alfredo','Bruno','Claudio','Domingo','Ernesto','Fidel','Gerardo','Horacio','Ismael','Julian','Leandro','Martin','Nestor','Ovidio','Prospero','Reinaldo','Silvio','Tobias','Umberto','Virgilio','Wilfredo','Abelardo','Benito','Cornelio','Demetrio','Elias','Florencio','Gregorio','Hipolito','Jacinto','Lisandro','Marcelo','Nicanor','Onofre','Pancracio','Rigoberto','Salomon','Timoteo','Urbano','Venancio','Wenceslao','Zenon','Adolfo','Braulio','Celestino','Desiderio','Eugenio','Fulgencio','Geronimo','Heriberto','Inocencio','Jeronimo','Ladislao','Melanio','Narciso','Olegario','Porfirio','Rosendo','Saturnino','Tranquilino','Ubaldo','Victorino','Yolanda','Zoilo','Agustin','Baltazar','Cipriano','Donato','Epifanio','Fortunato','Gumersindo','Hermenegildo','Isidoro','Justiniano','Leovigildo','Modesto','Natalio','Onesimo','Prudencio','Restituto','Sinforoso','Telesforo','Ubaldin','Ventura','Waldo','Zacarias','Anselmo','Bartolome','Crisanto','Delfin','Eleuterio','Froilan'];
const APELLIDOS = ['Garcia','Rodriguez','Martinez','Lopez','Gonzalez','Hernandez','Perez','Sanchez','Ramirez','Torres','Flores','Rivera','Gomez','Diaz','Cruz','Morales','Reyes','Gutierrez','Ortiz','Ramos','Romero','Alvarez','Mendoza','Ruiz','Jimenez','Medina','Vargas','Castro','Rojas','Guerrero','Herrera','Pena','Aguilar','Silva','Molina','Navarro','Delgado','Cabrera','Vega','Campos','Soto','Rios','Suarez','Figueroa','Sandoval','Contreras','Espinoza','Salazar','Nunez','Fuentes','Cardenas','Guzman','Pacheco','Acosta','Valencia','Mejia','Castillo','Paredes','Leon','Vasquez','Mora','Ochoa','Bernal','Ponce','Zamora','Lugo','Villegas','Arce','Duran','Ibarra','Lara','Maldonado','Marin','Montoya','Orozco','Pineda','Quintero','Rangel','Salgado','Trujillo','Uribe','Velasco','Yanez','Zapata','Arellano','Becerra','Camacho','Davila','Escobar','Franco','Galindo','Huerta','Jaramillo','Leal','Macias','Nava','Ojeda','Palma','Quezada','Rosales','Serrano','Tapia','Urbina','Valenzuela','Villalobos','Ximenes','Zarate','Balderas','Carmona','Dominguez','Enriquez','Fonseca','Garibay','Hinojosa','Izquierdo','Jurado','Lozano','Mercado','Navarrete','Oliva','Palacios','Quiroz','Renteria','Salas','Trevino','Ugalde','Villarreal','Yepez','Zuniga','Alvarado','Bustamante','Cervantes','Duarte','Escalante','Fierro','Gallegos','Hurtado','Infante','Jasso','Leyva','Montes','Negrete','Ornelas','Peralta','Quintana','Resendiz','Solano','Tovar','Urrutia','Villanueva','Yanez','Zepeda'];

async function main() {
  console.log('🎱 SIMULACIÓN MASIVA: 56 GRUPOS — 168 JUGADORES\n');

  const hash = await bcrypt.hash('admin1234', 12);
  const juez = await prisma.usuario.upsert({
    where: { email: 'juez_sim56@billar.com' },
    update: {},
    create: { nombre: 'Juez Simulación', email: 'juez_sim56@billar.com', password_hash: hash, rol: 'juez' },
  });

  // Crear 168 jugadores
  console.log('1️⃣  Creando 168 jugadores...');
  const jugadores: any[] = [];
  const clubes = ['Team Guancha','Club Roma','La Oficina','Zona 30','Los Tacos','El Diamante','Mesa Verde','Club Elite'];
  const cats = ['A','B','C'];

  for (let i = 0; i < 168; i++) {
    const nom = NOMBRES[i % NOMBRES.length];
    const ape = APELLIDOS[i % APELLIDOS.length];
    let nc = `${nom} ${ape}`;
    // Evitar duplicados
    const existe = await prisma.jugador.findUnique({ where: { nombre_completo: nc } });
    if (existe) {
      jugadores.push(existe);
      continue;
    }
    const j = await prisma.jugador.create({
      data: {
        nombre: nom, apellido: ape, nombre_completo: nc,
        club_ciudad: clubes[i % clubes.length],
        categoria: cats[i % cats.length],
        alias: `J${i + 1}`,
      },
    });
    jugadores.push(j);
  }
  console.log(`   ✅ ${jugadores.length} jugadores listos\n`);

  // Torneo
  console.log('2️⃣  Creando torneo...');
  const prev = await prisma.torneo.findFirst({ where: { nombre: 'Gran Copa TriBanda 168' } });
  if (prev) await prisma.torneo.delete({ where: { id: prev.id } });

  const torneo = await prisma.torneo.create({
    data: {
      nombre: 'Gran Copa TriBanda 168',
      descripcion: '168 jugadores — 56 grupos — Simulación masiva',
      fecha_inicio: new Date(), fecha_fin: new Date(Date.now() + 14 * 86400000),
      sede: 'Coliseo Nacional de Billar', incremento: 0.30, estado: 'activo',
    },
  });
  console.log(`   ✅ ${torneo.nombre}\n`);

  // Fase de grupos
  console.log('3️⃣  Creando 56 grupos de 3 jugadores...');
  const fase = await prisma.fase.create({
    data: { torneo_id: torneo.id, tipo: 'grupos', fecha: new Date(), orden: 1 },
  });

  const grupos: any[] = [];
  for (let g = 0; g < 56; g++) {
    const letra = g < 26 ? String.fromCharCode(65 + g) : `${String.fromCharCode(65 + Math.floor(g / 26) - 1)}${String.fromCharCode(65 + (g % 26))}`;
    const grupo = await prisma.grupo.create({
      data: { fase_id: fase.id, numero: g + 1, letra },
    });
    const js = [jugadores[g * 3], jugadores[g * 3 + 1], jugadores[g * 3 + 2]];
    for (const j of js) {
      await prisma.grupoJugador.create({ data: { grupo_id: grupo.id, jugador_id: j.id } });
    }
    grupos.push({ ...grupo, jugadores: js });
    if ((g + 1) % 10 === 0) process.stdout.write(`   ${g + 1}/56 grupos... `);
  }
  console.log(`\n   ✅ 56 grupos creados\n`);

  // Jugar partidas (3 por grupo = 168 partidas)
  console.log('4️⃣  Jugando 168 partidas (3 por grupo)...');
  let partidasJugadas = 0;

  for (const g of grupos) {
    const js = g.jugadores;
    const pares = [[js[0], js[1]], [js[0], js[2]], [js[1], js[2]]];

    for (const [jA, jB] of pares) {
      const p = await prisma.partida.create({
        data: { fase_id: fase.id, grupo_id: g.id, jugador_a_id: jA.id, jugador_b_id: jB.id, juez_id: juez.id, estado: 'en_curso', total_sets: 3 },
      });

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
            { set_id: set.id, jugador_id: jA.id, numero_entrada: e, carambolas: cA },
            { set_id: set.id, jugador_id: jB.id, numero_entrada: e, carambolas: cB },
          );
        }
        await prisma.entradaSet.createMany({ data: entradas });
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
          await prisma.ranking.update({ where: { id: ex.id }, data: { puntos: ex.puntos + (gano ? 2 : 0), sets_ganados: ex.sets_ganados + sg, sets_perdidos: ex.sets_perdidos + sp, carambolas_total: nc, entradas_total: ne, promedio: ne > 0 ? Math.round((nc / ne) * 1000) / 1000 : 0 } });
        } else {
          await prisma.ranking.create({ data: { torneo_id: torneo.id, jugador_id: jId, puntos: gano ? 2 : 0, sets_ganados: sg, sets_perdidos: sp, carambolas_total: car, entradas_total: ent, promedio: ent > 0 ? Math.round((car / ent) * 1000) / 1000 : 0 } });
        }
      }

      partidasJugadas++;
      if (partidasJugadas % 20 === 0) process.stdout.write(`   ${partidasJugadas}/168... `);
    }
  }
  console.log(`\n   ✅ ${partidasJugadas} partidas jugadas\n`);

  // Ranking final
  console.log('5️⃣  Calculando ranking...');
  const allR = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id }, include: { jugador: true },
    orderBy: [{ puntos: 'desc' }, { sets_ganados: 'desc' }, { promedio: 'desc' }],
  });
  for (let i = 0; i < allR.length; i++) {
    const r = allR[i];
    await prisma.ranking.update({ where: { id: r.id }, data: { posicion: i + 1, puntos_ranking: Math.round(r.puntos * 1.3 * 100) / 100 } });
  }

  // Top 10
  const top = await prisma.ranking.findMany({
    where: { torneo_id: torneo.id }, include: { jugador: true }, orderBy: { posicion: 'asc' }, take: 10,
  });
  console.log('\n   TOP 10:');
  console.log('   Pos | Jugador              | Club           | Pts | Prom.');
  for (const r of top) {
    console.log(`    ${String(r.posicion).padStart(2)} | ${r.jugador.nombre_completo.padEnd(20)} | ${r.jugador.club_ciudad.padEnd(14)} | ${String(r.puntos).padStart(3)} | ${r.promedio.toFixed(3)}`);
  }

  // Clasificados (1° de cada grupo)
  const clasificados = allR.filter(r => r.puntos >= 4).length;
  console.log(`\n   Jugadores con 4+ puntos (posibles clasificados): ${clasificados}`);
  console.log(`   Total jugadores en ranking: ${allR.length}`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ SIMULACIÓN 56 GRUPOS COMPLETADA');
  console.log(`  📌 Torneo: "${torneo.nombre}"`);
  console.log(`  📌 168 jugadores, 56 grupos, ${partidasJugadas} partidas`);
  console.log('  📌 Abre http://localhost:5173 para verlo');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
