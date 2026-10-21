import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Partida, Torneo } from '../../types';

export default function JuezPanelPage() {
  const { usuario, hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [modalCorreccion, setModalCorreccion] = useState<Partida | null>(null);
  const [motivo, setMotivo] = useState('');
  const esAdmin = hasRole('admin');

  // Obtener torneos con staleTime para no re-ejecutar innecesariamente
  const {
    data: torneos = [],
    isLoading: cargandoTorneos,
    refetch: recargarTorneos,
    isFetching: actualizandoTorneos,
  } = useQuery<Torneo[]>({
    queryKey: ['torneos-juez'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
    staleTime: 10000,
  });

  // Mostrar torneos activos; si no hay activos, mostrar los torneos en borrador con partidas antes de finalizados
  const torneosActivos = torneos.filter((t) => t.estado === 'activo');
  const torneosAMostrar = torneosActivos.length > 0 ? torneosActivos : torneos.filter((t) => t.estado !== 'finalizado');

  const solicitarCorreccionMutation = useMutation({
    mutationFn: ({ partidaId, motivo }: { partidaId: string; motivo: string }) =>
      api.post(`/partidas/${partidaId}/solicitar-correccion`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['juez-partidas'] });
      setModalCorreccion(null);
      setMotivo('');
      alert('Solicitud de corrección enviada al Administrador con éxito.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al enviar la solicitud de corrección');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header del juez */}
      <div
        className="card-dark rounded-2xl shadow-xl p-5"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1a4a1a 100%)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
              <span className="material-icons text-3xl text-yellow-300">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-heading font-extrabold text-white">Panel Oficial del Juez</h1>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                  {esAdmin ? 'Administrador / Juez' : 'Juez Oficial'}
                </span>
              </div>
              <p className="text-green-100/80 text-xs mt-0.5">
                {usuario?.nombre} ({usuario?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                recargarTorneos();
                qc.invalidateQueries({ queryKey: ['juez-partidas'] });
              }}
              disabled={actualizandoTorneos}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/20 transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span className={`material-icons text-sm ${actualizandoTorneos ? 'animate-spin' : ''}`}>
                refresh
              </span>
              {actualizandoTorneos ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Estado de carga */}
      {cargandoTorneos ? (
        <div className="card-flat text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-3 animate-spin">
            <span className="material-icons text-2xl">refresh</span>
          </div>
          <h3 className="font-bold text-gray-800 text-sm">Cargando torneos y partidas asignadas...</h3>
          <p className="text-gray-400 text-xs mt-1">Conectando con el servidor en tiempo real</p>
        </div>
      ) : torneosAMostrar.length === 0 ? (
        <div className="card-flat text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="material-icons text-5xl text-gray-300 block mb-3">sports_score</span>
          <h3 className="font-bold text-gray-700 text-base mb-1">No hay torneos disponibles</h3>
          <p className="text-gray-500 text-xs max-w-md mx-auto">
            No se encontraron torneos activos en este momento. Cuando el administrador cree y active un torneo con fases y partidas, aparecerán listados aquí.
          </p>
          {esAdmin && (
            <Link to="/torneos" className="btn-primary inline-flex items-center gap-1.5 text-xs mt-4">
              <span className="material-icons text-sm">emoji_events</span> Ir a Torneos
            </Link>
          )}
        </div>
      ) : (
        torneosAMostrar.map((torneo) => (
          <JuezTorneoSection
            key={torneo.id}
            torneo={torneo}
            juezId={usuario?.id}
            esAdmin={esAdmin}
            onSolicitarCorreccion={(p) => setModalCorreccion(p)}
          />
        ))
      )}

      {/* Modal solicitar corrección */}
      {modalCorreccion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-2 flex items-center gap-1.5">
              <span className="material-icons text-amber-500">edit_note</span>
              Solicitar Corrección al Administrador
            </h3>
            <p className="text-xs text-gray-600 mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200">
              La partida entre <strong>{modalCorreccion.jugador_a?.nombre_completo}</strong> y{' '}
              <strong>{modalCorreccion.jugador_b?.nombre_completo}</strong> está confirmada y bloqueada. Explique qué
              dato necesita corregir para que el administrador autorice la reapertura.
            </p>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Se anotaron 2 carambolas de más en la entrada 7 para el jugador A..."
              className="w-full h-28 p-3 border border-gray-300 rounded-xl mb-4 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalCorreccion(null)}
                className="btn-secondary text-xs px-4 py-2"
                disabled={solicitarCorreccionMutation.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  solicitarCorreccionMutation.mutate({ partidaId: modalCorreccion.id, motivo })
                }
                disabled={!motivo.trim() || solicitarCorreccionMutation.isPending}
                className="btn-primary text-xs px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {solicitarCorreccionMutation.isPending ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JuezTorneoSection({
  torneo,
  juezId,
  esAdmin,
  onSolicitarCorreccion,
}: {
  torneo: Torneo;
  juezId?: string;
  esAdmin: boolean;
  onSolicitarCorreccion: (p: Partida) => void;
}) {
  const [filtroVista, setFiltroVista] = useState<'mis' | 'todas'>(esAdmin ? 'todas' : 'mis');
  const [busqueda, setBusqueda] = useState('');

  const {
    data: partidas = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Partida[]>({
    queryKey: ['juez-partidas', torneo.id],
    queryFn: () => api.get(`/partidas/torneo/${torneo.id}`).then((r) => r.data),
    refetchInterval: 8000,
    staleTime: 4000,
  });

  const misPartidas = partidas.filter((p) => p.juez_id === juezId || !p.juez_id);
  const basePartidas = filtroVista === 'mis' ? misPartidas : partidas;

  const partidasFiltradas = basePartidas.filter((p) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const nomA = p.jugador_a?.nombre_completo?.toLowerCase() || '';
    const nomB = p.jugador_b?.nombre_completo?.toLowerCase() || '';
    const jz = p.juez?.nombre?.toLowerCase() || '';
    const est = p.estado.toLowerCase();
    return nomA.includes(q) || nomB.includes(q) || jz.includes(q) || est.includes(q);
  });

  const pendientes = partidasFiltradas.filter((p) => p.estado === 'pendiente');
  const enCurso = partidasFiltradas.filter((p) => p.estado === 'en_curso');
  const finalizadas = partidasFiltradas.filter((p) => p.estado === 'finalizada' && !p.confirmada);
  const confirmadas = partidasFiltradas.filter((p) => p.confirmada);

  return (
    <div className="card space-y-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Header del torneo con selector de filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary-600 text-xl">emoji_events</span>
            <h2 className="font-heading font-bold text-lg text-gray-900">{torneo.nombre}</h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                torneo.estado === 'activo'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {torneo.estado}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {partidas.length} partidas registradas en el torneo
          </p>
        </div>

        {/* Pestañas: Mis Partidas / Todas */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFiltroVista('mis')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              filtroVista === 'mis'
                ? 'bg-white text-emerald-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            👤 Mis Partidas ({misPartidas.length})
          </button>
          <button
            onClick={() => setFiltroVista('todas')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
              filtroVista === 'todas'
                ? 'bg-white text-emerald-800 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📋 Todas ({partidas.length})
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refrescar partidas de este torneo"
            className="p-1.5 text-gray-400 hover:text-emerald-700 transition rounded-lg"
          >
            <span className={`material-icons text-sm ${isFetching ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </div>

      {/* Buscador de partidas rápido */}
      {partidas.length > 4 && (
        <div className="relative">
          <span className="material-icons absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por jugador, mesa, o estado..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Spinner de carga si está cargando por primera vez */}
      {isLoading ? (
        <div className="text-center py-8">
          <span className="material-icons text-3xl text-emerald-600 animate-spin">refresh</span>
          <p className="text-xs text-gray-500 mt-2">Cargando partidas del torneo...</p>
        </div>
      ) : (
        <>
          {/* Partidas en curso — prioridad máxima */}
          {enCurso.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-icons text-amber-600 text-sm animate-pulse">play_circle</span>
                En juego ({enCurso.length})
              </h3>
              <div className="space-y-2">
                {enCurso.map((p) => (
                  <PartidaCard key={p.id} partida={p} accion="marcador" />
                ))}
              </div>
            </div>
          )}

          {/* Por confirmar */}
          {finalizadas.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-icons text-green-600 text-sm">check_circle</span>
                Por Confirmar Acta ({finalizadas.length})
              </h3>
              <div className="space-y-2">
                {finalizadas.map((p) => (
                  <PartidaCard key={p.id} partida={p} accion="confirmar" />
                ))}
              </div>
            </div>
          )}

          {/* Pendientes */}
          {pendientes.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-icons text-gray-500 text-sm">schedule</span>
                Partidas Pendientes por Iniciar ({pendientes.length})
              </h3>
              <div className="space-y-2">
                {pendientes.map((p) => (
                  <PartidaCard key={p.id} partida={p} accion="iniciar" />
                ))}
              </div>
            </div>
          )}

          {/* Confirmadas y Bloqueadas */}
          {confirmadas.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-icons text-gray-400 text-sm">lock</span>
                Confirmadas y Registradas ({confirmadas.length})
              </h3>
              <div className="space-y-2">
                {confirmadas.slice(0, 8).map((p) => (
                  <PartidaCard
                    key={p.id}
                    partida={p}
                    accion="ver"
                    onSolicitarCorreccion={() => onSolicitarCorreccion(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mensaje cuando no hay partidas en el filtro seleccionado */}
          {partidasFiltradas.length === 0 && (
            <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <span className="material-icons text-3xl text-gray-300 block mb-1">event_busy</span>
              {filtroVista === 'mis' && partidas.length > 0 ? (
                <div>
                  <p className="text-gray-600 text-xs font-medium">
                    No tienes partidas asignadas directamente a tu usuario.
                  </p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Hay {partidas.length} partidas disponibles en este torneo.
                  </p>
                  <button
                    onClick={() => setFiltroVista('todas')}
                    className="btn-secondary text-xs mt-3 inline-flex items-center gap-1 py-1 px-3"
                  >
                    <span className="material-icons text-xs">visibility</span> Ver todas las partidas
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-xs">
                  {busqueda
                    ? 'No se encontraron partidas con ese criterio de búsqueda.'
                    : 'Aún no se han autogenerado partidas en este torneo.'}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const estadoColor: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_curso: 'bg-amber-100 text-amber-800 border border-amber-200',
  finalizada: 'bg-green-100 text-green-800 border border-green-200',
};

function PartidaCard({
  partida,
  accion,
  onSolicitarCorreccion,
}: {
  partida: Partida;
  accion: 'marcador' | 'confirmar' | 'iniciar' | 'ver';
  onSolicitarCorreccion?: () => void;
}) {
  // Asegurar rutas que se mantengan en el JuezLayout (/juez/...)
  const btnMap = {
    marcador: {
      to: `/juez/marcador/${partida.id}`,
      label: 'Marcador Digital',
      icon: 'sports_score',
      cls: 'btn-secondary bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    },
    confirmar: {
      to: `/juez/planilla/${partida.id}`,
      label: 'Confirmar Planilla',
      icon: 'check',
      cls: 'btn-primary bg-emerald-700 hover:bg-emerald-800 text-white',
    },
    iniciar: {
      to: `/juez/marcador/${partida.id}`,
      label: 'Iniciar Partida',
      icon: 'play_arrow',
      cls: 'btn-primary bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    ver: {
      to: `/juez/planilla/${partida.id}`,
      label: 'Ver Planilla',
      icon: 'visibility',
      cls: 'btn-outline text-gray-700 border-gray-200 hover:bg-gray-50',
    },
  };
  const btn = btnMap[accion];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm hover:border-emerald-200 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-gray-900">{partida.jugador_a?.nombre_completo}</span>
          <span className="text-gray-400 text-xs font-semibold">vs</span>
          <span className="font-bold text-gray-900">{partida.jugador_b?.nombre_completo}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              partida.confirmada ? 'bg-blue-100 text-blue-900' : estadoColor[partida.estado]
            }`}
          >
            {partida.confirmada ? '🔒 Confirmada' : partida.estado === 'en_curso' ? '🔴 En juego' : partida.estado}
          </span>

          {partida.juez ? (
            <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
              <span>⚖️</span> {partida.juez.nombre}
            </span>
          ) : (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
              ⚖️ Sin juez asignado
            </span>
          )}

          {partida.grupo && (
            <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200 font-medium">
              Grupo {partida.grupo.numero}
            </span>
          )}

          {partida.solicitud_reapertura && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full animate-pulse">
              ⏳ Corrección solicitada
            </span>
          )}

          {partida.ganador && (
            <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
              🏆 {partida.ganador.nombre_completo}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {partida.confirmada && onSolicitarCorreccion && (
          <button
            onClick={onSolicitarCorreccion}
            disabled={partida.solicitud_reapertura}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              partida.solicitud_reapertura
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-amber-700 border-amber-300 hover:bg-amber-50'
            }`}
          >
            {partida.solicitud_reapertura ? 'Esperando Admin' : 'Solicitar Corrección'}
          </button>
        )}
        <Link
          to={btn.to}
          className={`${btn.cls} text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm active:scale-95`}
        >
          <span className="material-icons text-sm">{btn.icon}</span>
          {btn.label}
        </Link>
      </div>
    </div>
  );
}
