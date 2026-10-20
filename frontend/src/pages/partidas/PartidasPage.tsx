import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Partida, Fase } from '../../types';
import { useAuthStore } from '../../store/authStore';

const estadoColor: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_curso: 'bg-yellow-100 text-yellow-700',
  finalizada: 'bg-green-100 text-green-700',
};

export default function PartidasPage() {
  const { torneoId } = useParams<{ torneoId: string }>();
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [filtroFase, setFiltroFase] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: partidas, isLoading } = useQuery<Partida[]>({
    queryKey: ['partidas', torneoId, filtroFase, filtroEstado],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtroFase) params.set('fase_id', filtroFase);
      if (filtroEstado) params.set('estado', filtroEstado);
      return api.get(`/partidas/torneo/${torneoId}?${params}`).then((r) => r.data);
    },
  });

  const { data: fases } = useQuery<Fase[]>({
    queryKey: ['fases', torneoId],
    queryFn: () => api.get(`/torneos/${torneoId}/fases`).then((r) => r.data),
  });

  const { data: jueces = [] } = useQuery<{ id: string; nombre: string; email: string }[]>({
    queryKey: ['jueces-oficiales'],
    queryFn: () => api.get('/auth/usuarios?rol=juez').then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: hasRole('admin'),
  });

  const asignarJuezMut = useMutation({
    mutationFn: ({ partidaId, juezId }: { partidaId: string; juezId: string | null }) =>
      api.patch(`/partidas/${partidaId}/asignar-juez`, { juez_id: juezId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partidas'] });
    },
    onError: (err: any) => {
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

  if (isLoading) return <p className="text-gray-500">Cargando partidas...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            <span className="material-icons text-primary-600 align-middle mr-2">sports_score</span>
            Partidas
          </h1>
          <Link to={`/torneos/${torneoId}`} className="text-sm text-primary-600 hover:underline">
            ← Volver al torneo
          </Link>
        </div>
        {hasRole('admin') && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => autoAsignarJuecesMut.mutate()}
              disabled={autoAsignarJuecesMut.isPending}
              className="btn-secondary flex items-center gap-1 text-xs"
              title="Asigna automáticamente Juez Mesa 1 al Grupo 1, Juez Mesa 2 al Grupo 2, etc."
            >
              <span className="material-icons text-sm">balance</span>
              {autoAsignarJuecesMut.isPending ? 'Asignando...' : '⚖️ Auto-vincular Jueces / Mesas'}
            </button>
            <Link to={`/torneos/${torneoId}/partidas/nueva`} className="btn-primary text-xs">
              + Nueva partida
            </Link>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={filtroFase}
          onChange={(e) => setFiltroFase(e.target.value)}
          className="input sm:max-w-xs"
        >
          <option value="">Todas las fases</option>
          {fases?.map((f) => (
            <option key={f.id} value={f.id}>
              Fase {f.orden} — {f.tipo}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="input sm:max-w-xs"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_curso">En curso</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      {(!partidas || partidas.length === 0) ? (
        <p className="text-gray-400 text-center py-12">No hay partidas registradas.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Jugadores</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Grupo / Fase</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Juez / Mesa</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Resultado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className={p.ganador_id === p.jugador_a_id ? 'font-bold text-green-700' : ''}>
                        {p.jugador_a.nombre_completo}
                      </span>
                      <span className="text-gray-400 font-normal text-xs">vs</span>
                      <span className={p.ganador_id === p.jugador_b_id ? 'font-bold text-green-700' : ''}>
                        {p.jugador_b.nombre_completo}
                      </span>
                    </div>
                    {(p.meta_a || p.meta_b) && (
                      <span className="text-[11px] text-gray-400">
                        Distancia: {p.meta_a ?? 30} a {p.meta_b ?? 30} pts
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.grupo ? (
                      <span className="badge-primary text-xs font-bold">
                        Grupo {p.grupo.numero}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 capitalize">{p.fase?.tipo ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {hasRole('admin') ? (
                      <select
                        value={p.juez_id || ''}
                        onChange={(e) =>
                          asignarJuezMut.mutate({
                            partidaId: p.id,
                            juezId: e.target.value || null,
                          })
                        }
                        className="text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1 font-medium text-gray-700 hover:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        title="Asignar juez a esta partida"
                      >
                        <option value="">— Sin juez asignado —</option>
                        {jueces.map((j) => (
                          <option key={j.id} value={j.id}>
                            ⚖️ {j.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-600 font-medium">
                        {p.juez?.nombre ? `⚖️ ${p.juez.nombre}` : 'Sin asignar'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColor[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.ganador ? (
                      <span className="text-green-600 font-medium">
                        {p.ganador.nombre_completo}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/partidas/${p.id}/planilla`} className="btn-primary text-xs">
                      Planilla
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
