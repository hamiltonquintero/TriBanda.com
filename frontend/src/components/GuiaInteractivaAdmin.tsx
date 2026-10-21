import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api';
import { BracketData, Grupo, InscripcionTorneo, Partida, Torneo } from '../types';

interface GuiaInteractivaAdminProps {
  torneo: Torneo;
  inscripciones: InscripcionTorneo[];
  onOpenInscribir: () => void;
}

export default function GuiaInteractivaAdmin({
  torneo,
  inscripciones,
  onOpenInscribir,
}: GuiaInteractivaAdminProps) {
  const [expandido, setExpandido] = useState<boolean>(true);
  const torneoId = torneo.id;

  // 1. Usar fases y grupos precargados en el objeto torneo (Cero peticiones extra)
  const fases = torneo.fases || [];
  const faseGrupos = fases.find((f) => f.tipo === 'grupos');
  const grupos: Grupo[] = faseGrupos?.grupos || [];

  const totalInscritos = inscripciones.length;
  const pagadosCount = inscripciones.filter((i) => i.pago_confirmado).length;

  const gruposConJugadores = grupos.filter((g) => g.jugadores && g.jugadores.length > 0).length;
  const gruposListos = grupos.length > 0 && gruposConJugadores === grupos.length;

  // 2. Consultar partidas SOLO si los grupos ya están sorteados (Paso 3)
  // Sin refetchInterval para evitar bloqueos y consumo excesivo
  const { data: partidas = [] } = useQuery<Partida[]>({
    queryKey: ['partidas', torneoId],
    queryFn: () => api.get(`/partidas/torneo/${torneoId}`).then((r) => r.data),
    enabled: gruposListos,
    staleTime: 30000,
  });

  const partidasGrupo = partidas.filter((p) => p.grupo_id !== null);
  const totalPartidasGrupo = partidasGrupo.length;
  const partidasFinalizadas = partidasGrupo.filter((p) => p.estado === 'finalizada').length;
  const partidasEnJuego = partidasGrupo.filter((p) => p.estado === 'en_curso').length;
  const gruposCompletados = totalPartidasGrupo > 0 && partidasFinalizadas === totalPartidasGrupo;

  // 3. Consultar bracket SOLO si los grupos ya se completaron (Paso 4)
  const { data: bracket } = useQuery<BracketData>({
    queryKey: ['bracket', torneoId],
    queryFn: () => api.get(`/torneos/${torneoId}/bracket`).then((r) => r.data),
    enabled: gruposCompletados,
    staleTime: 30000,
  });

  const bracketGenerado = (bracket?.rondas?.length ?? 0) > 0;
  const tieneCampeon = Boolean(bracket?.campeon);

  // Determinación del paso activo (1 al 4)
  let pasoActivo = 1;
  if (totalInscritos < 2) {
    pasoActivo = 1;
  } else if (!gruposListos) {
    pasoActivo = 2;
  } else if (!gruposCompletados) {
    pasoActivo = 3;
  } else if (!bracketGenerado || !tieneCampeon) {
    pasoActivo = 4;
  } else {
    pasoActivo = 5; // Torneo completamente finalizado
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden transition-all">
      {/* Cabecera con selector para minimizar / expandir */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-900 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xl shadow-inner">
            🧭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Asistente Virtual
              </span>
              <span className="text-xs text-emerald-200/80 font-medium hidden sm:inline">
                Paso {pasoActivo > 4 ? 4 : pasoActivo} de 4
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black tracking-tight text-white mt-0.5">
              Guía Paso a Paso del Torneo
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg border border-white/20 transition flex items-center gap-1.5"
          >
            <span className="material-icons text-sm">
              {expandido ? 'unfold_less' : 'unfold_more'}
            </span>
            {expandido ? 'Minimizar guía' : 'Abrir guía interactiva'}
          </button>
        </div>
      </div>

      {/* Tarjeta de Orientación Inmediata: ¿Qué debo hacer ahora? */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-green-50/40 to-white border-b border-emerald-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm mt-0.5 animate-bounce">
              👉
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-800">
                ¿Qué debo hacer en este momento?
              </p>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                {pasoActivo === 1 && 'Paso 1: Chulea a los jugadores que participarán en este torneo'}
                {pasoActivo === 2 && 'Paso 2: Realiza el Sorteo Automático para armar los Grupos'}
                {pasoActivo === 3 &&
                  (totalPartidasGrupo === 0
                    ? 'Paso 3: Genera las partidas de grupos para que los jueces anoten los puntos'
                    : `Paso 3: En juego las partidas de grupos (${partidasFinalizadas}/${totalPartidasGrupo} listas)`)}
                {pasoActivo === 4 &&
                  (!bracketGenerado
                    ? 'Paso 4: ¡Grupos listos! Genera el Cuadro Final (Playoffs 32)'
                    : 'Paso 4: Disputar las llaves finales hasta la Gran Final')}
                {pasoActivo === 5 && '🏆 ¡Torneo Finalizado con Éxito! El campeón ha sido proclamado'}
              </h3>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                {pasoActivo === 1 &&
                  'Abre el directorio general con el botón verde. Verás todos los jugadores registrados. Solo debes marcar las casillas (chulear) de los que llegaron y confirmar si ya pagaron la inscripción.'}
                {pasoActivo === 2 &&
                  `Ya tienes ${totalInscritos} jugadores inscritos (${pagadosCount} con pago). Ahora ve a la pestaña de Grupos y presiona "Sorteo Automático". El sistema repartirá las mesas de forma balanceada.`}
                {pasoActivo === 3 &&
                  (totalPartidasGrupo === 0
                    ? 'Los grupos ya tienen sus integrantes asignados. Haz clic en "Autogenerar Partidas" para crear los enfrentamientos de todos contra todos.'
                    : `Hay ${partidasEnJuego} partidas en juego y ${partidasFinalizadas} finalizadas. A medida que los jueces anotan en el marcador, la tabla general de clasificación se calcula sola.`)}
                {pasoActivo === 4 &&
                  (!bracketGenerado
                    ? 'Se completaron los partidos de grupos. Entra a la sección de Bracket y presiona "Generar Cuadro Oficial". El sistema sembrará a los mejores automáticamente.'
                    : `El cuadro bilateral está en curso. Los ganadores de cada cruce avanzan automáticamente ronda tras ronda hasta llegar a la Gran Final.`)}
                {pasoActivo === 5 &&
                  'Todas las fases han culminado. Puedes imprimir las planillas oficiales, compartir el podio en la vista pública o consultar el ranking general del torneo.'}
              </p>
            </div>
          </div>

          {/* Botón de Acción Inmediata para el paso actual */}
          <div className="shrink-0">
            {pasoActivo === 1 && (
              <button
                type="button"
                onClick={onOpenInscribir}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">checklist</span>
                <span>Chulear Jugadores Ahora →</span>
              </button>
            )}

            {pasoActivo === 2 && (
              <Link
                to={`/torneos/${torneoId}/grupos`}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>🎲</span>
                <span>Hacer Sorteo de Grupos →</span>
              </Link>
            )}

            {pasoActivo === 3 && (
              <Link
                to={`/torneos/${torneoId}/partidas`}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">sports_score</span>
                <span>Ver Partidas y Marcadores →</span>
              </Link>
            )}

            {pasoActivo === 4 && (
              <Link
                to={`/torneos/${torneoId}/bracket`}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">account_tree</span>
                <span>{bracketGenerado ? 'Ver Cuadro y Gran Final →' : 'Generar Cuadro Final →'}</span>
              </Link>
            )}

            {pasoActivo === 5 && (
              <Link
                to={`/torneo/${torneoId}`}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2"
              >
                <span>🏆</span>
                <span>Ver Podio y Resultados →</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Vista expandida de las 4 casillas con resaltado interactivo */}
      {expandido && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* ─── CASILLA 1: INSCRIBIR Y CONFIRMAR ─── */}
            <div
              className={`relative rounded-xl p-4 border transition-all ${
                pasoActivo === 1
                  ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/20 shadow-md'
                  : totalInscritos >= 2
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-gray-200 bg-gray-50/60 opacity-80'
              }`}
            >
              {pasoActivo === 1 && (
                <span className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                  Tu acción actual
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      totalInscritos >= 2
                        ? 'bg-emerald-600 text-white'
                        : pasoActivo === 1
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {totalInscritos >= 2 ? '✓' : '1'}
                  </span>
                  <span className="text-xs font-bold text-gray-900">Inscripción y Pago</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    totalInscritos >= 2
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {totalInscritos >= 2 ? `${totalInscritos} listos` : 'Pendiente'}
                </span>
              </div>

              <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                Abre el listado general, chulea los billaristas que van a jugar y marca quién ya pagó.
              </p>

              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">
                  {pagadosCount} de {totalInscritos} pagaron
                </span>
                <button
                  type="button"
                  onClick={onOpenInscribir}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  {totalInscritos > 0 ? 'Modificar lista →' : '+ Chulear ahora →'}
                </button>
              </div>
            </div>

            {/* ─── CASILLA 2: SORTEO DE GRUPOS ─── */}
            <div
              className={`relative rounded-xl p-4 border transition-all ${
                pasoActivo === 2
                  ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/20 shadow-md'
                  : gruposListos
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-gray-200 bg-gray-50/60 opacity-80'
              }`}
            >
              {pasoActivo === 2 && (
                <span className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                  Tu acción actual
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      gruposListos
                        ? 'bg-emerald-600 text-white'
                        : pasoActivo === 2
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {gruposListos ? '✓' : '2'}
                  </span>
                  <span className="text-xs font-bold text-gray-900">Sorteo de Mesas</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    gruposListos
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {gruposListos ? `${grupos.length} grupos armados` : 'Esperando'}
                </span>
              </div>

              <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                Reparte los jugadores de forma aleatoria y transparente entre los grupos del torneo.
              </p>

              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">
                  {gruposListos ? `${grupos.length} grupos listos` : 'Por sortear'}
                </span>
                <Link
                  to={`/torneos/${torneoId}/grupos`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  {gruposListos ? 'Ver grupos →' : 'Ir a Sorteo →'}
                </Link>
              </div>
            </div>

            {/* ─── CASILLA 3: PARTIDAS Y JUZGAMIENTO ─── */}
            <div
              className={`relative rounded-xl p-4 border transition-all ${
                pasoActivo === 3
                  ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/20 shadow-md'
                  : gruposCompletados
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-gray-200 bg-gray-50/60 opacity-80'
              }`}
            >
              {pasoActivo === 3 && (
                <span className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                  Tu acción actual
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      gruposCompletados
                        ? 'bg-emerald-600 text-white'
                        : pasoActivo === 3
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {gruposCompletados ? '✓' : '3'}
                  </span>
                  <span className="text-xs font-bold text-gray-900">Jugar Partidas</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    gruposCompletados
                      ? 'bg-emerald-100 text-emerald-800'
                      : totalPartidasGrupo > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {gruposCompletados
                    ? 'Grupos terminados'
                    : totalPartidasGrupo > 0
                    ? `${partidasFinalizadas}/${totalPartidasGrupo}`
                    : 'Sin partidas'}
                </span>
              </div>

              <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                Los jueces anotan en las tablets en tiempo real. La tabla de posiciones se calcula sola.
              </p>

              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">
                  {partidasEnJuego > 0 ? `● ${partidasEnJuego} en vivo` : 'Marcador digital'}
                </span>
                <Link
                  to={`/torneos/${torneoId}/partidas`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Abrir partidas →
                </Link>
              </div>
            </div>

            {/* ─── CASILLA 4: CUADRO FINAL (PLAYOFFS 32) ─── */}
            <div
              className={`relative rounded-xl p-4 border transition-all ${
                pasoActivo === 4 || pasoActivo === 5
                  ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/20 shadow-md'
                  : 'border-gray-200 bg-gray-50/60 opacity-80'
              }`}
            >
              {(pasoActivo === 4 || pasoActivo === 5) && (
                <span className="absolute -top-2.5 left-4 bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                  {tieneCampeon ? '🏆 Finalizado' : 'Fase Decisiva'}
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      tieneCampeon
                        ? 'bg-amber-400 text-black font-black'
                        : pasoActivo === 4
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {tieneCampeon ? '🏆' : '4'}
                  </span>
                  <span className="text-xs font-bold text-gray-900">Playoffs 32 (Final)</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tieneCampeon
                      ? 'bg-amber-100 text-amber-900'
                      : bracketGenerado
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tieneCampeon
                    ? '¡Hay Campeón!'
                    : bracketGenerado
                    ? 'Llaves en juego'
                    : 'Esperando grupos'}
                </span>
              </div>

              <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
                Siembra a los mejores en el cuadro bilateral y define al Campeón y Subcampeón oficial.
              </p>

              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">
                  {tieneCampeon ? bracket?.campeon?.nombre_completo : 'Eliminación directa'}
                </span>
                <Link
                  to={`/torneos/${torneoId}/bracket`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  {bracketGenerado ? 'Ver Llaves TV →' : 'Generar Cuadro →'}
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
