import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Partida, Fase } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function PartidasPage() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [filtroFase, setFiltroFase] = useState('');
  const [tabEstado, setTabEstado] = useState<'todas' | 'en_curso' | 'pendiente' | 'finalizada'>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Obtenemos todas las partidas de la fase o torneo para calcular conteos en vivo
  const { data: partidas = [], isLoading } = useQuery<Partida[]>({
    queryKey: ['partidas', torneoId, filtroFase],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtroFase) params.set('fase_id', filtroFase);
      return api.get(`/partidas/torneo/${torneoId}?${params}`).then((r) => r.data);
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const { data: fases = [] } = useQuery<Fase[]>({
    queryKey: ['fases', torneoId],
    queryFn: () => api.get(`/torneos/${torneoId}/fases`).then((r) => r.data),
  });

  const { data: jueces = [] } = useQuery<{ id: string; nombre: string; email: string }[]>({
    queryKey: ['jueces-oficiales'],
    queryFn: () => api.get('/auth/usuarios?rol=juez').then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: hasRole('admin', 'juez'),
  });

  const asignarJuezMut = useMutation({
    mutationFn: ({ partidaId, juezId }: { partidaId: string; juezId: string | null }) =>
      api.patch(`/partidas/${partidaId}/asignar-juez`, { juez_id: juezId }),
    onMutate: async ({ partidaId, juezId }) => {
      await qc.cancelQueries({ queryKey: ['partidas', torneoId, filtroFase] });
      const previousPartidas = qc.getQueryData<Partida[]>(['partidas', torneoId, filtroFase]);
      if (previousPartidas) {
        const juezObj = jueces.find((j) => j.id === juezId) || null;
        qc.setQueryData<Partida[]>(
          ['partidas', torneoId, filtroFase],
          previousPartidas.map((p) =>
            p.id === partidaId
              ? { ...p, juez_id: juezId || undefined, juez: juezObj }
              : p
          )
        );
      }
      return { previousPartidas };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partidas'] });
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousPartidas) {
        qc.setQueryData(['partidas', torneoId, filtroFase], context.previousPartidas);
      }
      alert(err.response?.data?.error || 'Error al asignar juez');
    },
  });

  const autoAsignarJuecesMut = useMutation({
    mutationFn: () => {
      const targetFaseId = filtroFase || fases?.[0]?.id;
      if (!targetFaseId) throw new Error('No hay fases configuradas en este torneo');
      return api.post(`/grupos/fase/${targetFaseId}/auto-asignar-jueces`);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['partidas'] });
      const lista = res.data.asignaciones
        ?.map((a: any) => `• Grupo ${a.grupo_numero}: ${a.jugador_a} vs ${a.jugador_b} ➔ ${a.juez_nombre}`)
        .join('\n') || '';
      alert(`⚖️ ¡Mesas y Jueces Asignados!\nSe vincularon ${res.data.total_asignadas} mesas para la ronda inicial:\n${lista}`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al auto-asignar jueces');
    },
  });

  const generarPartidasMut = useMutation({
    mutationFn: (faseId: string) => api.post(`/grupos/fase/${faseId}/generar-partidas`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['partidas'] });
      alert(`⚡ ¡Listo! Se generaron ${res.data.total_creadas} partidas automáticamente.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al generar partidas');
    },
  });

  // Conteos en vivo
  const totalTodas = partidas.length;
  const totalEnCurso = partidas.filter((p) => p.estado === 'en_curso').length;
  const totalPendientes = partidas.filter((p) => p.estado === 'pendiente').length;
  const totalFinalizadas = partidas.filter((p) => p.estado === 'finalizada').length;

  // Filtrado por pestaña de estado y buscador de jugador
  const partidasFiltradas = partidas.filter((p) => {
    if (tabEstado !== 'todas' && p.estado !== tabEstado) return false;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const jA = p.jugador_a?.nombre_completo?.toLowerCase() || '';
      const jB = p.jugador_b?.nombre_completo?.toLowerCase() || '';
      const clubA = p.jugador_a?.club_ciudad?.toLowerCase() || '';
      const clubB = p.jugador_b?.club_ciudad?.toLowerCase() || '';
      const grupoNom = p.grupo ? `grupo ${p.grupo.numero}` : '';
      return jA.includes(q) || jB.includes(q) || clubA.includes(q) || clubB.includes(q) || grupoNom.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Tarjeta principal con fondo blanco y máxima legibilidad */}
      <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-gray-100">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl material-icons text-xl">sports_score</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 tracking-tight">
                  Gestión y Control de Partidas
                </h1>
                <p className="text-xs text-gray-500">
                  Monitorea mesas en vivo, partidas por jugar y resultados oficiales del torneo.
                </p>
              </div>
            </div>
            <Link
              to={`/torneos/${torneoId}`}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold mt-2 hover:underline"
            >
              ← Volver al detalle del torneo
            </Link>
          </div>

          {hasRole('admin') && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => autoAsignarJuecesMut.mutate()}
                disabled={autoAsignarJuecesMut.isPending}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                title="Asigna automáticamente jueces a las mesas iniciales"
              >
                <span>⚖️</span>
                <span>{autoAsignarJuecesMut.isPending ? 'Asignando...' : 'Auto-vincular Jueces / Mesas'}</span>
              </button>
              <Link
                to={`/torneos/${torneoId}/partidas/nueva`}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1"
              >
                <span>+</span>
                <span>Nueva partida manual</span>
              </Link>
            </div>
          )}
        </div>

        {/* Banner de Guía Asistida en Partidas */}
        <div className="mt-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              3
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Paso 3: Arbitraje y Marcadores en Vivo
                </span>
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {totalFinalizadas} de {totalTodas} partidas terminadas
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-0.5">
                Los jueces anotan entradas y carambolas en la <strong>Planilla Digital</strong>. Al terminar todas las partidas de grupo, el sistema calculará la tabla general para pasar al <strong>Paso 4 (Playoffs 32)</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Link
              to={`/torneos/${torneoId}`}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition shadow-2xs flex items-center gap-1"
            >
              <span className="material-icons text-sm">assignment</span>
              <span>Ver Guía General</span>
            </Link>
          </div>
        </div>

        {/* Barra de Filtros: Selector de Fase y Buscador */}
        <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Selector de fase */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700 shrink-0">Fase del Torneo:</label>
            <select
              value={filtroFase}
              onChange={(e) => setFiltroFase(e.target.value)}
              className="text-xs font-medium border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Todas las fases ({fases.length})</option>
              {fases.map((f) => (
                <option key={f.id} value={f.id}>
                  Fase {f.orden} — {f.tipo.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador de jugador / mesa */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por jugador, club o mesa..."
              className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="material-icons absolute left-2.5 top-2 text-gray-400 text-sm">search</span>
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Estado con Conteos en Vivo */}
        <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setTabEstado('todas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tabEstado === 'todas'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>📋 Todas</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tabEstado === 'todas' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {totalTodas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabEstado('en_curso')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tabEstado === 'en_curso'
                ? 'bg-yellow-500 text-white shadow-sm'
                : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
              En Juego / En Curso
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tabEstado === 'en_curso' ? 'bg-white/25 text-white' : 'bg-yellow-200 text-yellow-900'}`}>
              {totalEnCurso}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabEstado('pendiente')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tabEstado === 'pendiente'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <span>⏳ Por Jugar / Pendientes</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tabEstado === 'pendiente' ? 'bg-white/25 text-white' : 'bg-blue-200 text-blue-900'}`}>
              {totalPendientes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabEstado('finalizada')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              tabEstado === 'finalizada'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>🏆 Finalizadas</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tabEstado === 'finalizada' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
              {totalFinalizadas}
            </span>
          </button>
        </div>

        {/* Contenido / Listado de partidas */}
        <div className="mt-4">
          {isLoading ? (
            <div className="py-16 text-center text-gray-500 text-xs">
              <span className="material-icons animate-spin text-2xl text-emerald-600 mb-2 block">autorenew</span>
              Cargando partidas del torneo...
            </div>
          ) : totalTodas === 0 ? (
            /* Estado cuando la fase no tiene partidas creadas */
            <div className="py-12 px-4 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <span className="text-4xl block mb-2">🎱</span>
              <h3 className="font-bold text-gray-800 text-base mb-1">
                Aún no hay partidas generadas en esta fase
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                Si ya realizaste el sorteo de grupos, puedes generar el fixture de partidas automáticamente con un solo clic.
              </p>
              {(() => {
                const targetFaseId = filtroFase || fases.find((f) => f.tipo === 'grupos' || f.tipo === 'clasificatorio')?.id || fases[0]?.id;
                if (!targetFaseId) return null;
                return (
                  <button
                    type="button"
                    onClick={() => generarPartidasMut.mutate(targetFaseId)}
                    disabled={generarPartidasMut.isPending}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition inline-flex items-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>{generarPartidasMut.isPending ? 'Generando...' : 'Autogenerar Partidas de Grupos Ahora'}</span>
                  </button>
                );
              })()}
            </div>
          ) : partidasFiltradas.length === 0 ? (
            /* Estado cuando el filtro seleccionado no tiene partidas */
            <div className="py-12 px-4 text-center bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-3xl block mb-2">
                {tabEstado === 'en_curso' ? '⏱️' : tabEstado === 'finalizada' ? '🏁' : '🔍'}
              </span>
              <h3 className="font-bold text-gray-800 text-sm mb-1">
                {tabEstado === 'en_curso'
                  ? 'No hay partidas en juego en este momento'
                  : tabEstado === 'finalizada'
                  ? 'Aún no ha concluido ninguna partida'
                  : 'No se encontraron partidas con ese filtro'}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {tabEstado === 'en_curso' && totalPendientes > 0
                  ? `Hay ${totalPendientes} partidas pendientes de jugar listas para iniciar en el marcador.`
                  : 'Prueba cambiando la pestaña de estado o limpiando el buscador.'}
              </p>
              <div className="flex justify-center gap-2">
                {tabEstado === 'en_curso' && totalPendientes > 0 && (
                  <button
                    type="button"
                    onClick={() => setTabEstado('pendiente')}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-blue-700 transition"
                  >
                    Ver partidas por jugar ({totalPendientes})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTabEstado('todas');
                    setBusqueda('');
                  }}
                  className="px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-100 transition"
                >
                  Ver todas las partidas ({totalTodas})
                </button>
              </div>
            </div>
          ) : (
            /* Tabla de Partidas */
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[880px] text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="text-left px-4 py-3 min-w-[340px]">Enfrentamiento (Jugador A vs Jugador B)</th>
                    <th className="text-center px-3 py-3 w-28 whitespace-nowrap">Grupo / Fase</th>
                    <th className="text-left px-3 py-3 w-44 whitespace-nowrap">Juez Oficial</th>
                    <th className="text-center px-3 py-3 w-28 whitespace-nowrap">Estado</th>
                    <th className="text-center px-3 py-3 w-32 whitespace-nowrap">Resultado</th>
                    <th className="text-right px-4 py-3 w-36 whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {partidasFiltradas.map((p) => {
                    const esEnCurso = p.estado === 'en_curso';
                    const esFinalizada = p.estado === 'finalizada';
                    const esPendiente = p.estado === 'pendiente';

                    return (
                      <tr
                        key={p.id}
                        className={`transition ${
                          esEnCurso
                            ? 'bg-yellow-50/60 hover:bg-yellow-100/50'
                            : esFinalizada
                            ? 'hover:bg-gray-50'
                            : 'hover:bg-blue-50/30'
                        }`}
                      >
                        {/* Jugadores */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {/* Jugador A */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-4 h-4 shrink-0 rounded-full border border-gray-300 bg-white shadow-2xs flex items-center justify-center text-[10px]" title="Bola Blanca">
                                  ⚪
                                </span>
                                <span className={`font-bold text-xs truncate ${p.ganador_id === p.jugador_a_id ? 'text-emerald-700 font-extrabold' : 'text-gray-900'}`}>
                                  {p.jugador_a?.nombre_completo}
                                </span>
                                {p.jugador_a?.alias && (
                                  <span className="text-[11px] text-gray-400 italic truncate shrink-0">"{p.jugador_a.alias}"</span>
                                )}
                              </div>
                              {p.ganador_id === p.jugador_a_id && (
                                <span className="shrink-0 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                                  <span>✓ Ganador</span>
                                  <span>🏆</span>
                                </span>
                              )}
                            </div>

                            {/* Jugador B */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-4 h-4 shrink-0 rounded-full border border-amber-300 bg-yellow-300 shadow-2xs flex items-center justify-center text-[10px]" title="Bola Amarilla">
                                  🟡
                                </span>
                                <span className={`font-bold text-xs truncate ${p.ganador_id === p.jugador_b_id ? 'text-emerald-700 font-extrabold' : 'text-gray-900'}`}>
                                  {p.jugador_b?.nombre_completo}
                                </span>
                                {p.jugador_b?.alias && (
                                  <span className="text-[11px] text-gray-400 italic truncate shrink-0">"{p.jugador_b.alias}"</span>
                                )}
                              </div>
                              {p.ganador_id === p.jugador_b_id && (
                                <span className="shrink-0 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                                  <span>✓ Ganador</span>
                                  <span>🏆</span>
                                </span>
                              )}
                            </div>

                            {/* Distancia / Entradas */}
                            {(p.meta_a || p.meta_b) && (
                              <div className="text-[10px] text-gray-400 pt-0.5 pl-6 flex items-center gap-2">
                                <span>Distancia: <strong>{p.meta_a ?? 30}</strong> vs <strong>{p.meta_b ?? 30}</strong> pts</span>
                                {p.limite_entradas && <span>• Máx {p.limite_entradas} entradas</span>}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Grupo / Fase */}
                        <td className="px-3 py-3 text-center">
                          {p.grupo ? (
                            <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-xs">
                              Grupo {p.grupo.numero}
                            </span>
                          ) : (
                            <span className="text-gray-600 font-medium capitalize">
                              {p.fase?.tipo ?? 'Fase'}
                            </span>
                          )}
                        </td>

                        {/* Juez Oficial */}
                        <td className="px-3 py-3">
                          {hasRole('admin') ? (
                            <select
                              value={p.juez_id || ''}
                              onChange={(e) =>
                                asignarJuezMut.mutate({
                                  partidaId: p.id,
                                  juezId: e.target.value || null,
                                })
                              }
                              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2 py-1 font-medium text-gray-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">— Sin juez asignado —</option>
                              {jueces.map((j) => (
                                <option key={j.id} value={j.id}>
                                  ⚖️ {j.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-700 font-medium flex items-center gap-1">
                              <span>⚖️</span>
                              <span>{p.juez?.nombre || 'Sin juez asignado'}</span>
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-3 text-center">
                          {esEnCurso ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></span>
                              EN JUEGO
                            </span>
                          ) : esFinalizada ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <span>✓</span> FINALIZADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                              <span>⏳</span> POR JUGAR
                            </span>
                          )}
                        </td>

                        {/* Resultado */}
                        <td className="px-3 py-3 text-center">
                          {p.ganador ? (
                            <div className="font-bold text-emerald-700">
                              🏆 {p.ganador.nombre_completo.split(' ')[0]}
                            </div>
                          ) : esEnCurso ? (
                            <span className="text-[11px] text-yellow-800 font-semibold bg-yellow-100 px-2 py-0.5 rounded">
                              En progreso...
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Acciones directas */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botón Marcador (destacado si está en curso o pendiente) */}
                            <Link
                              to={`/partidas/${p.id}/marcador`}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                                esEnCurso
                                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse'
                                  : esPendiente
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                              title="Abrir el marcador oficial en pantalla completa"
                            >
                              <span>🎯</span>
                              <span>{esEnCurso ? 'Marcador' : esPendiente ? 'Iniciar' : 'Marcador'}</span>
                            </Link>

                            {/* Botón Planilla */}
                            <Link
                              to={`/partidas/${p.id}/planilla`}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                              title="Ver o editar planilla oficial con entradas"
                            >
                              Planilla
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

