import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BracketCruce, BracketData, BracketRonda, BracketSlotItem } from '../../types';

interface BilateralBracketViewProps {
  bracket: BracketData;
  torneoNombre?: string;
  isPublic?: boolean;
}

// ─── COMPONENTE DE SLOT INDIVIDUAL ───────────────────────────────────────────

function PlayerSlotBox({
  slot,
  isWinner,
  isLoser,
  isBye,
  accentColor,
}: {
  slot?: BracketSlotItem | null;
  isWinner?: boolean;
  isLoser?: boolean;
  isBye?: boolean;
  accentColor?: 'red' | 'blue' | 'gold' | 'default';
}) {
  const jugador = slot?.jugador;
  const partida = slot?.partida;
  const setsGanados = partida?.sets?.filter((s) => s.ganador_id === jugador?.id).length ?? 0;

  // Estilos de acento
  const borderClass =
    accentColor === 'red'
      ? 'border-red-300 hover:border-red-500'
      : accentColor === 'blue'
      ? 'border-blue-300 hover:border-blue-500'
      : accentColor === 'gold'
      ? 'border-amber-400 shadow-amber-200/50'
      : 'border-gray-200';

  if (isBye || (!jugador && slot?.semilla && !slot?.partida_id)) {
    return (
      <div
        className={`h-9 px-2.5 rounded-md flex items-center justify-between text-xs bg-gray-50/80 border border-dashed border-gray-300 text-gray-400 select-none ${borderClass}`}
      >
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400">
          <span className="w-5 h-5 rounded bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-[10px]">
            {slot?.semilla ?? '-'}
          </span>
          <span className="italic">[ Pase Directo / BYE ]</span>
        </span>
      </div>
    );
  }

  if (!jugador) {
    return (
      <div
        className={`h-9 px-2.5 rounded-md flex items-center justify-between text-xs bg-gray-50 border border-dashed border-gray-200 text-gray-400 select-none ${borderClass}`}
      >
        <span className="italic text-[11px] text-gray-400">Esperando rival...</span>
      </div>
    );
  }

  return (
    <div
      className={`h-9 px-2.5 rounded-md flex items-center justify-between text-xs transition duration-150 border ${
        isWinner
          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-sm'
          : isLoser
          ? 'bg-gray-100/70 border-gray-200 text-gray-400 line-through'
          : `bg-white text-gray-900 ${borderClass}`
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {slot?.semilla && (
          <span
            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-bold text-[10px] font-mono ${
              isWinner
                ? 'bg-emerald-600 text-white'
                : accentColor === 'red'
                ? 'bg-red-100 text-red-800'
                : accentColor === 'blue'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-200 text-gray-700'
            }`}
            title={`Semilla #${slot.semilla}`}
          >
            {slot.semilla}
          </span>
        )}
        <div className="truncate flex flex-col">
          <span className="font-semibold truncate text-[12px] leading-tight">
            {jugador.nombre_completo}
          </span>
          {(jugador.club?.nombre || jugador.club_ciudad) && (
            <span className="text-[9px] text-gray-500 font-normal truncate leading-none">
              {jugador.club?.nombre ?? jugador.club_ciudad}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        {partida && partida.estado !== 'pendiente' && (
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
              isWinner ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {setsGanados}
          </span>
        )}
        {isWinner && (
          <span className="text-[10px] text-emerald-700 font-extrabold" title="Ganador">
            ✓
          </span>
        )}
      </div>
    </div>
  );
}

// ─── TARJETA DE CRUCE / MATCH ────────────────────────────────────────────────

function MatchCard({
  cruce,
  wing,
  isFinal = false,
  isPublic = false,
}: {
  cruce: BracketCruce;
  wing: 'left' | 'right' | 'center';
  isFinal?: boolean;
  isPublic?: boolean;
}) {
  const { slot_a, slot_b } = cruce;
  const partida = slot_a.partida ?? slot_b.partida;
  const ganadorId = partida?.ganador_id;

  const isAWinner = Boolean(ganadorId && slot_a.jugador && ganadorId === slot_a.jugador.id);
  const isALoser = Boolean(ganadorId && slot_a.jugador && ganadorId !== slot_a.jugador.id);
  const isBWinner = Boolean(ganadorId && slot_b.jugador && ganadorId === slot_b.jugador.id);
  const isBLoser = Boolean(ganadorId && slot_b.jugador && ganadorId !== slot_b.jugador.id);

  // Detección de pase directo (BYE)
  const isA_Bye = Boolean(slot_a.jugador && !slot_b.jugador && slot_a.semilla && !partida);
  const isB_Bye = Boolean(slot_b.jugador && !slot_a.jugador && slot_b.semilla && !partida);

  const accentColor =
    isFinal ? 'gold' : wing === 'left' ? 'red' : wing === 'right' ? 'blue' : 'default';

  return (
    <div
      className={`relative w-56 flex-shrink-0 bg-white rounded-lg shadow-sm border p-1.5 transition hover:shadow-md ${
        isFinal
          ? 'border-2 border-amber-400 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20'
          : wing === 'left'
          ? 'border-red-200/80 hover:border-red-400'
          : 'border-blue-200/80 hover:border-blue-400'
      }`}
    >
      {/* Header del match */}
      <div className="flex justify-between items-center text-[10px] px-1 pb-1 mb-1 border-b border-gray-100 text-gray-500">
        <span className="font-mono font-medium">
          {isFinal ? '🏆 GRAN FINAL' : `Cruce #${Math.ceil((slot_a.posicion ?? 1) / 2)}`}
        </span>
        {partida ? (
          <span
            className={`font-semibold ${
              partida.estado === 'finalizada'
                ? 'text-emerald-600'
                : partida.estado === 'en_curso'
                ? 'text-amber-600 animate-pulse'
                : 'text-gray-400'
            }`}
          >
            {partida.estado === 'finalizada'
              ? 'Finalizado'
              : partida.estado === 'en_curso'
              ? '● En Juego'
              : 'Programado'}
          </span>
        ) : isA_Bye || isB_Bye ? (
          <span className="text-emerald-600 font-bold text-[9px] uppercase tracking-wider">
            Pase a Octavos ✓
          </span>
        ) : (
          <span className="text-gray-400 text-[10px]">Por Definir</span>
        )}
      </div>

      {/* Slots de los 2 contrincantes */}
      <div className="space-y-1">
        <PlayerSlotBox
          slot={slot_a}
          isWinner={isAWinner || isA_Bye}
          isLoser={isALoser}
          isBye={!slot_a.jugador && isB_Bye}
          accentColor={isFinal ? 'red' : accentColor}
        />
        <PlayerSlotBox
          slot={slot_b}
          isWinner={isBWinner || isB_Bye}
          isLoser={isBLoser}
          isBye={!slot_b.jugador && isA_Bye}
          accentColor={isFinal ? 'blue' : accentColor}
        />
      </div>

      {/* Acciones de admin/juez o visor */}
      {partida && !isPublic && (
        <div className="mt-1.5 pt-1 flex justify-between items-center border-t border-gray-100 px-1 text-[10px]">
          <Link
            to={`/partidas/${partida.id}/marcador`}
            className="text-primary-700 hover:text-primary-900 font-bold flex items-center gap-0.5"
          >
            <span className="material-icons text-[12px]">scoreboard</span>
            Marcador
          </Link>
          <Link
            to={`/partidas/${partida.id}/planilla`}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-0.5"
          >
            <span className="material-icons text-[12px]">description</span>
            Planilla
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── COLUMNA DE RONDA ────────────────────────────────────────────────────────

function RoundColumn({
  ronda,
  cruces,
  wing,
  title,
}: {
  ronda?: BracketRonda;
  cruces: BracketCruce[];
  wing: 'left' | 'right';
  title: string;
}) {
  const isLeft = wing === 'left';
  const badgeBg = isLeft ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="flex flex-col flex-shrink-0 w-60" data-ronda={ronda?.numero}>
      {/* Encabezado de la ronda */}
      <div className="text-center mb-3">
        <span
          className={`inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-sm ${badgeBg}`}
        >
          {title}
        </span>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {cruces.length} {cruces.length === 1 ? 'partida' : 'partidas'}
        </p>
      </div>

      {/* Cruces distribuidos verticalmente */}
      <div className="flex-1 flex flex-col justify-around gap-3 py-1">
        {cruces.map((cruce, idx) => (
          <div key={idx} className="relative flex items-center justify-center">
            <MatchCard cruce={cruce} wing={wing} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL BILATERAL BRACKET VIEW ─────────────────────────────

export default function BilateralBracketView({
  bracket,
  torneoNombre,
  isPublic = false,
}: BilateralBracketViewProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const rondas = bracket?.rondas ?? [];
  if (rondas.length === 0) return null;

  // Gran Final (Ronda 2)
  const rondaFinal = rondas.find((r) => r.numero === 2);
  const cruceFinal = rondaFinal?.cruces?.[0];

  // Rondas eliminatorias anteriores a la final ordenadas de mayor a menor (ej. 32, 16, 8, 4)
  const rondasEliminatorias = rondas
    .filter((r) => r.numero > 2)
    .sort((a, b) => b.numero - a.numero);

  // Tamaño del bracket (32, 16, etc.)
  const bracketSize = bracket.tamano || rondasEliminatorias[0]?.numero || 32;

  return (
    <div className="space-y-4">
      {/* Controles de Zoom y Ajuste */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="material-icons text-sm text-amber-500">tv</span>
          <span className="font-medium">Formato Bilateral Oficial (Playoffs TV)</span>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 font-bold"
            title="Reducir zoom"
          >
            -
          </button>
          <span className="px-2 text-xs font-mono font-semibold text-gray-700">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 font-bold"
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="px-2 py-1 text-[11px] rounded hover:bg-gray-100 text-gray-500 font-medium"
          >
            100%
          </button>
        </div>
      </div>

      {/* Contenedor con Scroll y Zoom */}
      <div className="overflow-x-auto pb-8 pt-2 rounded-2xl bg-gradient-to-b from-gray-50 via-white to-gray-50 border border-gray-200 shadow-inner">
        <div
          className="min-w-max mx-auto p-4 transition-transform duration-200 origin-top"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {/* BANNER SUPERIOR OFICIAL: PLAYOFFS [32 TEAMS] */}
          <div className="flex flex-col items-center mb-8">
            {torneoNombre && (
              <p className="text-xs uppercase font-extrabold tracking-widest text-gray-500 mb-2">
                {torneoNombre}
              </p>
            )}
            <div className="relative inline-flex items-center shadow-2xl rounded-xl overflow-hidden border-2 border-amber-500/80">
              {/* Barra dorada superior decorativa */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500" />

              <div className="bg-gradient-to-r from-gray-950 via-black to-gray-950 text-amber-400 font-heading font-black tracking-widest text-2xl sm:text-3xl px-8 py-3 uppercase flex items-center gap-3">
                <span className="text-amber-300 text-xl">★</span>
                <span>PLAYOFFS</span>
                <span className="text-amber-300 text-xl">★</span>
              </div>

              <div className="bg-gradient-to-b from-amber-400 to-amber-600 text-black font-extrabold px-5 py-3 flex flex-col items-center justify-center border-l-2 border-amber-300">
                <span className="text-xl sm:text-2xl font-black leading-none">{bracketSize}</span>
                <span className="text-[9px] uppercase tracking-widest font-black leading-none mt-0.5">
                  JUGADORES
                </span>
              </div>
            </div>
          </div>

          {/* ESTRUCTURA BILATERAL: ALA IZQUIERDA (ROJO) + CENTRO (FINAL & TROFEO) + ALA DERECHA (AZUL) */}
          <div className="flex items-stretch justify-center gap-4 lg:gap-6">
            {/* ─── ALA IZQUIERDA (Red Wing) ─── */}
            <div className="flex gap-4 lg:gap-6 items-stretch">
              {rondasEliminatorias.map((ronda) => {
                const totalCruces = ronda.cruces.length;
                const mitad = totalCruces / 2;
                const crucesIzquierda = ronda.cruces.slice(0, mitad);

                return (
                  <RoundColumn
                    key={`left-${ronda.numero}`}
                    ronda={ronda}
                    cruces={crucesIzquierda}
                    wing="left"
                    title={ronda.nombre}
                  />
                );
              })}
            </div>

            {/* ─── CENTRO: GRAN FINAL & PODIO CAMPEÓN ─── */}
            <div className="flex flex-col items-center justify-center px-4 min-w-[280px] max-w-xs flex-shrink-0">
              {/* Podio del Campeón 🏆 */}
              {bracket.campeon ? (
                <div className="w-full mb-6 bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 rounded-2xl p-4 text-center text-gray-950 shadow-xl border-2 border-amber-300 animate-fadeIn">
                  <div className="text-4xl mb-1 filter drop-shadow">🏆</div>
                  <span className="text-[10px] uppercase font-black tracking-widest bg-black/20 text-white px-3 py-0.5 rounded-full inline-block mb-1">
                    CAMPEÓN OFICIAL
                  </span>
                  <h3 className="font-heading font-black text-xl leading-tight">
                    {bracket.campeon.nombre_completo}
                  </h3>
                  <p className="text-xs font-semibold text-amber-950/90 mt-0.5">
                    {bracket.campeon.club?.nombre ?? bracket.campeon.club_ciudad ?? 'TriBanda'}
                  </p>
                  {bracket.subcampeon && (
                    <div className="mt-3 pt-2 border-t border-black/10 text-[11px] text-gray-900 font-medium">
                      🥈 Subcampeón: <strong>{bracket.subcampeon.nombre_completo}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full mb-6 bg-gradient-to-b from-gray-900 to-black text-amber-300 rounded-2xl p-4 text-center border border-amber-500/40 shadow-lg">
                  <div className="text-3xl mb-1">🏆</div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                    Copa TriBanda
                  </span>
                  <p className="text-xs text-gray-300 mt-1">Por disputarse el título</p>
                </div>
              )}

              {/* Cruce de la Gran Final */}
              {cruceFinal && (
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2 shadow-sm">
                    Gran Final
                  </span>
                  <MatchCard cruce={cruceFinal} wing="center" isFinal={true} isPublic={isPublic} />
                </div>
              )}
            </div>

            {/* ─── ALA DERECHA (Blue Wing - Espejada) ─── */}
            <div className="flex gap-4 lg:gap-6 items-stretch">
              {/* Para reflejar el ala derecha hacia adentro como en el diagrama:
                  Semifinal 2 -> Cuartos Der -> Octavos Der -> Dieciseisavos Der */}
              {[...rondasEliminatorias].reverse().map((ronda) => {
                const totalCruces = ronda.cruces.length;
                const mitad = totalCruces / 2;
                const crucesDerecha = ronda.cruces.slice(mitad);

                return (
                  <RoundColumn
                    key={`right-${ronda.numero}`}
                    ronda={ronda}
                    cruces={crucesDerecha}
                    wing="right"
                    title={ronda.nombre}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
