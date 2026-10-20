import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { JugadorConHistorial } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function JugadorDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();

  const { data: j, isLoading } = useQuery<JugadorConHistorial>({
    queryKey: ['jugador', id],
    queryFn: () => api.get(`/jugadores/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (!j) return <p className="text-red-500">Jugador no encontrado</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link to="/jugadores" className="text-sm text-primary-600 hover:underline">← Volver</Link>
          <h1 className="text-2xl font-bold mt-1">{j.nombre_completo}</h1>
          {j.alias && <p className="text-sm text-gray-500 italic">"{j.alias}"</p>}
        </div>
        {hasRole('admin') && (
          <Link to={`/jugadores/${j.id}/editar`} className="btn-secondary text-sm self-start">Editar</Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <p><span className="text-gray-500">Club:</span> {j.club_ciudad}</p>
        {j.ciudad && <p><span className="text-gray-500">Ciudad:</span> {j.ciudad}{j.pais ? `, ${j.pais}` : ''}</p>}
        {j.cedula && <p><span className="text-gray-500">Cédula:</span> {j.cedula}</p>}
        {j.celular && <p><span className="text-gray-500">Celular:</span> {j.celular}</p>}
        <p><span className="text-gray-500">Promedio histórico:</span> {j.promedio_historico.toFixed(3)}</p>
        <p><span className="text-gray-500">Estado:</span> {j.activo ? 'Activo' : 'Inactivo'}</p>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-lg mb-3">Historial en torneos</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="pb-2 pr-2">Torneo</th>
                <th className="pb-2 pr-2">Fecha</th>
                <th className="pb-2 pr-2">Pos.</th>
                <th className="pb-2 pr-2">Pts</th>
                <th className="pb-2">Ranking</th>
              </tr>
            </thead>
            <tbody>
              {j.rankings?.map((r) => (
                <tr key={r.torneo_id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{r.torneo.nombre}</td>
                  <td className="py-2 pr-2 text-gray-500">{new Date(r.torneo.fecha_inicio).toLocaleDateString('es-CO')}</td>
                  <td className="py-2 pr-2">{r.posicion || '—'}</td>
                  <td className="py-2 pr-2">{r.puntos}</td>
                  <td className="py-2">{r.puntos_ranking?.toFixed?.(2) ?? r.puntos_ranking}</td>
                </tr>
              ))}
              {(!j.rankings || j.rankings.length === 0) && (
                <tr><td colSpan={5} className="py-3 text-gray-400">Sin registros de ranking.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
