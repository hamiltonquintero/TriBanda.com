import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { RankingItem } from '../../types';
import { exportarCSV, exportarPDF } from '../../utils/exportar';
import { useAuthStore } from '../../store/authStore';

export default function RankingPage() {
  const { id } = useParams<{ id: string }>();
  const torneoId = id ?? '';
  const { hasRole } = useAuthStore();
  const [tab, setTab] = useState<'general' | 'clubes'>('general');

  const { data: ranking = [], isLoading } = useQuery<RankingItem[]>({
    queryKey: ['ranking', torneoId],
    queryFn: () => api.get(`/ranking/${torneoId}`).then((r) => r.data),
    enabled: !!torneoId,
    refetchInterval: 20000,
  });

  const top3 = useMemo(() => ranking.slice(0, 3), [ranking]);
  const medallas = ['🥇', '🥈', '🥉'];

  function handleExportCSV() {
    exportarCSV(
      ranking.map((r) => ({
        Posición: r.posicion,
        Jugador: r.nombre_completo,
        Club: r.club_ciudad,
        Puntos: r.puntos,
        'Promedio General': r.promedio,
        'Promedio Individual': r.promedio_particular ?? 0,
        'Mayor Serie': r.mayor_serie ?? 0,
        'Carambolas Total': r.carambolas_total,
        'Entradas Total': r.entradas_total,
        'Sets Ganados': r.sets_ganados,
        'Sets Perdidos': r.sets_perdidos,
        'Puntos Ranking Final': r.puntos_ranking,
      })),
      `ranking-torneo-${torneoId}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            <span className="material-icons text-primary-600 align-middle mr-2">leaderboard</span>
            Ranking y Clasificación Oficial (Norma UMB/Fecolbi)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Criterios de desempate: 1° Puntos → 2° Prom. General → 3° Prom. Particular → 4° Mayor Serie → 5° Carambolas
          </p>
          <Link to={`/torneos/${torneoId}`} className="text-sm text-primary-600 hover:underline">← Volver al torneo</Link>
        </div>
        {hasRole('admin') && (
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={handleExportCSV} disabled={!ranking.length}>
              <span className="material-icons text-sm align-middle mr-1">table_chart</span>Excel
            </button>
            <button className="btn-primary text-xs" onClick={() => exportarPDF('Ranking del Torneo')} disabled={!ranking.length}>
              <span className="material-icons text-sm align-middle mr-1">picture_as_pdf</span>PDF
            </button>
          </div>
        )}
      </div>

      {/* Podio */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[top3[1], top3[0], top3[2]].map((item, i) => {
            const pos = i === 0 ? 1 : i === 1 ? 0 : 2;
            return (
              <div key={item.jugador_id}
                className={`card-flat text-center ${pos === 0 ? 'ring-2 ring-accent-400 scale-105 bg-amber-50/40' : ''}`}>
                <p className="text-3xl mb-1">{medallas[item.posicion - 1]}</p>
                <p className="font-heading font-bold text-sm truncate">{item.nombre_completo}</p>
                {item.alias && <p className="text-xs text-gray-400 truncate">"{item.alias}"</p>}
                <p className="text-xs text-gray-500 truncate">{item.club_ciudad}</p>
                <p className="text-lg font-bold text-primary-700 mt-1">{item.puntos_ranking} pts</p>
                <div className="text-[11px] text-gray-500 mt-1 flex justify-center gap-2">
                  <span>Gral: <strong>{item.promedio.toFixed(3)}</strong></span>
                  <span>Serie: <strong>{item.mayor_serie ?? 0}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1">
        <button onClick={() => setTab('general')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'general' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
          📊 General Individual
        </button>
        <button onClick={() => setTab('clubes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'clubes' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
          🏛️ Por Delegación / Club
        </button>
      </div>

      {/* Tabla general */}
      {tab === 'general' && (
        <div className="card-flat overflow-x-auto">
          {isLoading ? <p className="text-gray-500">Cargando...</p> : (
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
                  <th className="text-center">Pts Rank</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.jugador_id} className={r.posicion <= 3 ? 'bg-green-50/60 font-semibold' : ''}>
                    <td className="font-bold">
                      {r.posicion <= 3 ? `${medallas[r.posicion - 1]} ${r.posicion}` : r.posicion}
                    </td>
                    <td className="font-medium">{r.nombre_completo}</td>
                    <td className="text-gray-500">{r.club_ciudad}</td>
                    <td className="text-center font-bold">{r.puntos}</td>
                    <td className="text-center font-bold text-primary-700">{r.promedio.toFixed(3)}</td>
                    <td className="text-center text-xs text-gray-600">
                      {r.promedio_particular ? r.promedio_particular.toFixed(3) : '-'}
                    </td>
                    <td className="text-center font-semibold text-accent-700">
                      {r.mayor_serie ?? 0}
                    </td>
                    <td className="text-center">{r.carambolas_total}</td>
                    <td className="text-center">{r.entradas_total}</td>
                    <td className="text-center font-bold text-emerald-700">
                      {r.puntos_ranking > 0 ? r.puntos_ranking : '-'}
                    </td>
                  </tr>
                ))}
                {!ranking.length && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      No hay datos de ranking aún para este torneo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
