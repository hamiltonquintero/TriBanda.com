import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Torneo, RankingItem, BracketData, Partida, Grupo } from '../../types';
import BilateralBracketView from '../bracket/BilateralBracketView';

export default function PublicTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'ranking' | 'partidas' | 'bracket' | 'grupos'>('ranking');
  const [modoProyector, setModoProyector] = useState(false);

  const { data: torneo } = useQuery<Torneo>({
    queryKey: ['pub-torneo', id],
    queryFn: () => api.get(`/torneos/${id}`).then((r) => r.data),
  });

  const { data: ranking = [] } = useQuery<RankingItem[]>({
    queryKey: ['pub-ranking', id],
    queryFn: () => api.get(`/ranking/${id}`).then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: partidas = [] } = useQuery<Partida[]>({
    queryKey: ['pub-partidas', id],
    queryFn: () => api.get(`/partidas/torneo/${id}`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: bracket } = useQuery<BracketData>({
    queryKey: ['pub-bracket', id],
    queryFn: () => api.get(`/torneos/${id}/bracket`).then((r) => r.data),
    refetchInterval: 15000,
  });

  // Fase de grupos
  const faseGrupos = torneo?.fases?.find((f) => f.tipo === 'grupos');
  const { data: grupos = [] } = useQuery<Grupo[]>({
    queryKey: ['pub-grupos', faseGrupos?.id],
    queryFn: () => api.get(`/grupos/${faseGrupos!.id}`).then((r) => r.data),
    enabled: !!faseGrupos,
    refetchInterval: 15000,
  });

  const enCurso = partidas.filter((p) => p.estado === 'en_curso');
  const recientes = partidas.filter((p) => p.estado === 'finalizada').slice(0, 10);

  return (
    <div className={`min-h-screen ${modoProyector ? 'bg-slate-950 text-white p-4' : 'bg-billar'}`}>
      {/* Header */}
      {!modoProyector && (
        <header className="bg-black/50 backdrop-blur-sm border-b border-white/10 py-3">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/publico" className="flex items-center gap-2">
                <span className="text-xl font-heading font-extrabold text-white">TRIBANDA</span>
                <span className="text-white/40 text-xs">Pantalla de Espectadores</span>
              </Link>
              <span className="hidden md:inline-block bg-white/10 text-white/80 text-[11px] px-2.5 py-0.5 rounded-full border border-white/15">
                Desarrollado por <strong className="text-emerald-400">Hamilton Quintero</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/torneos/${id}`}
                className="btn-outline text-xs text-emerald-300 border-emerald-400/50 hover:bg-emerald-400/10 flex items-center gap-1"
                title="Ir al panel de administración y guía paso a paso"
              >
                <span>🧭</span>
                <span className="hidden sm:inline">Panel y</span> Guía
              </Link>
              <button
                onClick={() => setModoProyector(true)}
                className="btn-outline text-xs text-accent-300 border-accent-400 hover:bg-accent-400/20"
                title="Modo pantalla para proyectores y televisores en sala"
              >
                <span className="material-icons text-xs align-middle mr-1">tv</span>
                Modo Proyector / TV
              </button>

              <Link to="/login" className="btn-outline text-xs">Acceso Juez/Admin</Link>
            </div>
          </div>
        </header>
      )}

      {modoProyector && (
        <div className="flex justify-between items-center bg-white/5 border border-white/10 px-6 py-2 rounded-xl mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-heading font-black tracking-wider text-accent-400">TRIBANDA EN VIVO</span>
            <span className="text-xs bg-red-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">TRANSMISIÓN</span>
          </div>
          <button
            onClick={() => setModoProyector(false)}
            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
          >
            ✕ Salir de Modo TV
          </button>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Info del torneo */}
        <div className="card-dark mb-6" style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1a4a1a 100%)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              {torneo?.estado === 'activo' && <span className="badge-amber text-[10px] mb-2 inline-block">EN VIVO</span>}
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">{torneo?.nombre}</h1>
              {torneo?.descripcion && <p className="text-green-200/70 text-sm mt-1">{torneo.descripcion}</p>}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-green-100/70">
                <span><span className="material-icons text-xs align-middle mr-1 text-accent-400">location_on</span>{torneo?.sede}</span>
                <span><span className="material-icons text-xs align-middle mr-1 text-accent-400">calendar_today</span>{torneo ? new Date(torneo.fecha_inicio).toLocaleDateString('es-CO') : ''}</span>
              </div>
            </div>
            {bracket?.campeon && (
              <div className="text-center bg-white/10 rounded-xl px-6 py-3 backdrop-blur-sm border border-white/20">
                <p className="text-accent-400 text-3xl">🏆</p>
                <p className="text-white font-bold">{bracket.campeon.nombre_completo}</p>
                <p className="text-white/60 text-xs">Campeón del Torneo</p>
              </div>
            )}
          </div>
        </div>

        {/* Partidas en curso — banner destacado */}
        {enCurso.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-heading font-bold mb-3 flex items-center gap-1.5">
              <span className="material-icons text-accent-400 animate-pulse">sports_score</span>
              Partidas en Juego Ahora ({enCurso.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {enCurso.map((p) => (
                <Link key={p.id} to={`/partidas/${p.id}/marcador`} className="card-glass hover:bg-white/20 transition block p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-base">{p.jugador_a?.nombre_completo}</p>
                      <p className="text-white/40 text-xs my-0.5">vs</p>
                      <p className="font-bold text-white text-base">{p.jugador_b?.nombre_completo}</p>
                    </div>
                    <span className="material-icons text-accent-400 text-3xl">scoreboard</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(['ranking', 'partidas', 'bracket', 'grupos'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                tab === t
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {t === 'ranking' && '📊 Tabla de Ranking'}
              {t === 'partidas' && '🎱 Resultados'}
              {t === 'bracket' && '🏆 Llaves & Ajuste'}
              {t === 'grupos' && '👥 Fase de Grupos'}
            </button>
          ))}
        </div>

        {/* Contenido por tab */}
        {tab === 'ranking' && (
          <div className="bg-white rounded-xl shadow-xl overflow-x-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-heading font-bold text-lg text-gray-900">
                Clasificación Oficial del Torneo
              </h2>
              <span className="text-xs text-gray-400">
                Desempate: Puntos → Prom. Gral → Prom. Ind. → Mayor Serie
              </span>
            </div>
            {ranking.length === 0 ? (
              <p className="text-gray-400 text-sm py-6 text-center">Sin posiciones registradas aún.</p>
            ) : (
              <table className="table-billar">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Jugador</th>
                    <th>Club / Ciudad</th>
                    <th className="text-center">Pts</th>
                    <th className="text-center">Prom. Gral</th>
                    <th className="text-center">Prom. Ind.</th>
                    <th className="text-center">M. Serie</th>
                    <th className="text-center">CAR</th>
                    <th className="text-center">ENT</th>
                    <th className="text-center">Puntos Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.jugador_id} className={r.posicion <= 3 ? 'bg-green-50/70 font-semibold' : ''}>
                      <td className="font-bold text-center">
                        {r.posicion === 1 ? '🥇 1' : r.posicion === 2 ? '🥈 2' : r.posicion === 3 ? '🥉 3' : r.posicion}
                      </td>
                      <td className="font-medium text-gray-900">
                        {r.nombre_completo}
                        {r.alias && <span className="text-gray-400 text-xs ml-1">"{r.alias}"</span>}
                      </td>
                      <td className="text-gray-500">{r.club_ciudad}</td>
                      <td className="text-center font-bold text-gray-900">{r.puntos}</td>
                      <td className="text-center font-bold text-primary-700">{r.promedio.toFixed(3)}</td>
                      <td className="text-center text-xs text-gray-600">
                        {r.promedio_particular ? r.promedio_particular.toFixed(3) : '-'}
                      </td>
                      <td className="text-center font-semibold text-accent-700">{r.mayor_serie ?? 0}</td>
                      <td className="text-center">{r.carambolas_total}</td>
                      <td className="text-center">{r.entradas_total}</td>
                      <td className="text-center font-bold text-emerald-700">{r.puntos_ranking > 0 ? r.puntos_ranking : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'partidas' && (
          <div className="bg-white rounded-xl shadow-xl p-5">
            <h2 className="font-heading font-bold text-lg mb-3">Resultados recientes</h2>
            {recientes.length === 0 ? (
              <p className="text-gray-400 text-sm">Sin resultados aún.</p>
            ) : (
              <div className="space-y-2">
                {recientes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">{p.jugador_a?.nombre_completo}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="font-semibold text-gray-900">{p.jugador_b?.nombre_completo}</span>
                    </div>
                    {p.ganador && (
                      <span className="text-xs text-green-700 font-bold bg-green-50 px-2 py-1 rounded-md">
                        🏆 {p.ganador.nombre_completo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'bracket' && (
          <div className="space-y-4">
            {!bracket?.rondas?.length ? (
              <div className="bg-white rounded-xl shadow-xl p-8 text-center text-gray-400">
                <span className="material-icons text-5xl text-gray-300 block mb-2">account_tree</span>
                El cuadro de llaves aún no ha sido publicado.
              </div>
            ) : (
              <BilateralBracketView bracket={bracket} torneoNombre={torneo?.nombre} isPublic={true} />
            )}
          </div>
        )}

        {tab === 'grupos' && (
          <div className="space-y-6">
            {grupos.length === 0 ? (
              <div className="bg-white rounded-xl shadow-xl p-8 text-center text-gray-400">
                No hay grupos configurados para este torneo aún.
              </div>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.id} className="bg-white rounded-xl shadow-xl p-5">
                  <h3 className="font-heading font-bold text-base text-gray-900 mb-2">
                    Grupo {grupo.numero}{grupo.letra ? ` — ${grupo.letra}` : ''}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table-billar text-xs">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Jugador</th>
                          <th>Club</th>
                          <th className="text-center">Pts</th>
                          <th className="text-center">Prom. Gral</th>
                          <th className="text-center">Prom. Ind.</th>
                          <th className="text-center">M. Serie</th>
                          <th className="text-center">CAR</th>
                          <th className="text-center">ENT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.tabla?.map((fila) => (
                          <tr key={fila.jugador_id} className={fila.posicion <= 2 ? 'bg-green-50/60 font-semibold' : ''}>
                            <td className="font-bold text-center">
                              {fila.posicion <= 2 ? `✓ ${fila.posicion}` : fila.posicion}
                            </td>
                            <td className="font-medium text-gray-900">{fila.nombre_completo}</td>
                            <td className="text-gray-500">{fila.club}</td>
                            <td className="text-center font-bold text-gray-900">{fila.puntos}</td>
                            <td className="text-center font-bold text-primary-700">{fila.promedio.toFixed(3)}</td>
                            <td className="text-center text-gray-600">{fila.promedio_particular ? fila.promedio_particular.toFixed(3) : '-'}</td>
                            <td className="text-center font-semibold text-accent-700">{fila.mayor_serie ?? 0}</td>
                            <td className="text-center">{fila.carambolas}</td>
                            <td className="text-center">{fila.entradas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {!modoProyector && (
        <footer className="bg-black/60 text-center py-4 border-t border-white/10 text-xs">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-white/60">TRIBANDA — Sistema Oficial de Gestión de Torneos de Billar a Tres Bandas</span>
            <span className="text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              Creado y Desarrollado por <strong className="text-emerald-400">Hamilton Quintero</strong>
            </span>
          </div>
        </footer>
      )}

      {modoProyector && (
        <div className="fixed bottom-3 right-4 text-xs text-white/80 bg-black/75 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-md shadow-lg z-50 flex items-center gap-2">
          <span className="font-bold text-white tracking-wider">TRIBANDA</span>
          <span className="text-white/40">•</span>
          <span>Desarrollado por <strong className="text-emerald-400 font-bold">Hamilton Quintero</strong></span>
        </div>
      )}
    </div>
  );
}

