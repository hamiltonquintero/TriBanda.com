import { useQuery } from '@tanstack/react-query';
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
          <Link to={`/torneos/${torneoId}/partidas/nueva`} className="btn-primary">
            + Nueva partida
          </Link>
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
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fase</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Resultado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {p.jugador_a.nombre_completo}
                    <span className="text-gray-400 mx-1">vs</span>
                    {p.jugador_b.nombre_completo}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {p.fase?.tipo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.fecha ? new Date(p.fecha).toLocaleDateString('es-CO') : '—'}
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
