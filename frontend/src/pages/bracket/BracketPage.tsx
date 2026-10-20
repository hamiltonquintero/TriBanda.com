import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { BracketData, Fase, InfoClasificados } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const torneoId = id ?? '';
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [tamanoManual, setTamanoManual] = useState<number>(0); // 0 = automático (con ajuste si aplica)

  const { data: fases = [] } = useQuery<Fase[]>({
    queryKey: ['fases', torneoId],
    queryFn: () => api.get(`/torneos/${torneoId}/fases`).then((r) => r.data),
    enabled: !!torneoId,
  });

  const faseGrupos = fases.filter((f) => f.tipo === 'grupos').sort((a, b) => a.orden - b.orden)[0];
  const faseLlaves = fases.filter((f) => f.tipo === 'llaves' || f.tipo === 'final').sort((a, b) => a.orden - b.orden)[0];

  const { data: infoClasificados } = useQuery<InfoClasificados>({
    queryKey: ['clasificados-fase', faseGrupos?.id],
    queryFn: () => api.get(`/grupos/${faseGrupos!.id}/clasificados`).then((r) => r.data),
    enabled: !!faseGrupos,
  });

  const { data, isLoading } = useQuery<BracketData>({
    queryKey: ['bracket', torneoId],
    queryFn: () => api.get(`/torneos/${torneoId}/bracket`).then((r) => r.data),
    enabled: !!torneoId,
    refetchInterval: 12000,
  });

  const generar = useMutation({
    mutationFn: async () => {
      if (!faseGrupos || !faseLlaves) throw new Error('Falta fase de grupos o fase de llaves');
      const ids = infoClasificados?.tabla_general.map((c) => c.jugador_id) ?? [];
      await api.post(`/bracket/${faseLlaves.id}/generar`, {
        jugador_ids: ids,
        ...(tamanoManual > 0 && { tamano_bracket: tamanoManual }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bracket', torneoId] });
      qc.invalidateQueries({ queryKey: ['pub-bracket', torneoId] });
    },
  });

  const totalClasificados = infoClasificados?.total_clasificados ?? 0;
  const esquema = infoClasificados?.esquema_ajuste;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            <span className="material-icons text-primary-600 align-middle mr-2">account_tree</span>
            Cuadro de Eliminación Directa (Llaves)
          </h1>
          <Link to={`/torneos/${torneoId}`} className="text-sm text-primary-600 hover:underline">← Volver al torneo</Link>
        </div>
      </div>

      {/* Panel de generación — solo admin */}
      {hasRole('admin') && (!data || data.rondas.length === 0) && (
        <div className="card space-y-4">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <span className="material-icons text-accent-500">auto_fix_high</span>
            Generar Llaves con Ronda de Ajuste (Regla Oficial)
          </h2>

          {esquema && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-2">
              <p className="font-semibold text-amber-950 flex items-center gap-1">
                <span className="material-icons text-sm">info</span>
                Cálculo automático de ajuste:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Total de clasificados de grupos: <strong>{totalClasificados}</strong></li>
                <li>Potencia objetivo más cercana (hacia abajo): <strong>{esquema.potencia_objetivo}</strong></li>
                <li>Clasifican directo al cuadro: <strong>{esquema.clasificados_directos_count}</strong> (los mejores {esquema.clasificados_directos_count} de la tabla general)</li>
                <li>Disputan Ronda de Ajuste: <strong>{esquema.juegan_ajuste_count}</strong> (los últimos {esquema.juegan_ajuste_count} clasificados)</li>
                <li>Partidas de ajuste a jugar: <strong>{esquema.sobrantes}</strong> partidas</li>
              </ul>
            </div>
          )}

          <div>
            <label className="label">Modo de Generación</label>
            <select
              value={tamanoManual}
              onChange={(e) => setTamanoManual(Number(e.target.value))}
              className="input max-w-xs"
            >
              <option value={0}>Automático Oficial (Ronda de Ajuste hacia abajo)</option>
              <option value={8}>Fijo 8 jugadores (Cuartos)</option>
              <option value={16}>Fijo 16 jugadores (Octavos)</option>
              <option value={32}>Fijo 32 jugadores (Dieciseisavos)</option>
            </select>
          </div>

          <button
            onClick={() => generar.mutate()}
            disabled={!faseGrupos || !faseLlaves || generar.isPending || totalClasificados < 2}
            className="btn-primary"
          >
            {generar.isPending ? 'Generando llaves...' : `Generar Cuadro Oficial (${totalClasificados} clasificados)`}
          </button>

          {!faseGrupos && <p className="error text-xs">Necesitas crear una fase de grupos primero.</p>}
          {!faseLlaves && <p className="error text-xs">Necesitas crear una fase de llaves primero.</p>}
          {generar.isError && (
            <p className="error text-xs">{(generar.error as any)?.response?.data?.error ?? (generar.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Bracket visual */}
      {isLoading && <p className="text-gray-500">Cargando bracket...</p>}

      {!isLoading && data && data.rondas.length > 0 && (
        <div className="space-y-6">
          {/* Campeón y Subcampeón */}
          {data.campeon && (
            <div className="bg-gradient-to-r from-emerald-800 via-green-700 to-emerald-900 rounded-2xl p-6 text-center text-white shadow-xl">
              <p className="text-5xl mb-2">🏆</p>
              <h2 className="text-3xl font-heading font-extrabold">{data.campeon.nombre_completo}</h2>
              <p className="text-green-200 text-sm mt-1">
                {data.campeon.club?.nombre ?? data.campeon.club_ciudad} — ¡CAMPEÓN DEL TORNEO!
              </p>
              {data.subcampeon && (
                <p className="text-xs text-green-100/70 mt-2">
                  🥈 Subcampeón: {data.subcampeon.nombre_completo}
                </p>
              )}
            </div>
          )}

          {/* Rondas Horizontales con Scroll */}
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-6 min-w-max">
              {data.rondas.map((ronda) => {
                const esAjuste = ronda.es_ajuste || ronda.numero === 99;
                return (
                  <div
                    key={ronda.numero}
                    className={`w-72 flex-shrink-0 flex flex-col ${
                      esAjuste ? 'bg-amber-50/70 p-3 rounded-2xl border-2 border-dashed border-amber-300' : ''
                    }`}
                  >
                    <div className="text-center mb-3">
                      {esAjuste && (
                        <span className="badge-amber text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                          PLAY-IN / REPECHAJE
                        </span>
                      )}
                      <h3 className={`font-heading font-extrabold text-sm ${esAjuste ? 'text-amber-900' : 'text-primary-700'}`}>
                        {ronda.nombre}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {ronda.cruces.length} partida{ronda.cruces.length > 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="space-y-4 flex-1 flex flex-col justify-around">
                      {ronda.cruces.map((cruce, idx) => {
                        const jA = cruce.slot_a?.jugador;
                        const jB = cruce.slot_b?.jugador;
                        const partida = cruce.slot_a?.partida ?? cruce.slot_b?.partida;
                        const ganadorId = partida?.ganador_id;

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border shadow-sm p-3 transition ${
                              esAjuste ? 'bg-white border-amber-200' : 'bg-white border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5 pb-1 border-b border-gray-100">
                              <span>Match #{idx + 1}</span>
                              {partida && (
                                <span className={`font-semibold ${
                                  partida.estado === 'finalizada' ? 'text-green-600' :
                                  partida.estado === 'en_curso' ? 'text-amber-600 animate-pulse' : 'text-gray-400'
                                }`}>
                                  {partida.estado === 'finalizada' ? 'Finalizada' :
                                   partida.estado === 'en_curso' ? 'En Vivo' : 'Pendiente'}
                                </span>
                              )}
                            </div>

                            {/* Jugador A */}
                            <div
                              className={`py-1.5 px-2.5 rounded-lg flex items-center justify-between text-xs mb-1 transition ${
                                ganadorId && ganadorId === jA?.id
                                  ? 'bg-green-100 text-green-950 font-bold'
                                  : ganadorId && jA && ganadorId !== jA.id
                                  ? 'bg-gray-50 text-gray-400 line-through'
                                  : jA ? 'bg-gray-50 text-gray-900 font-medium' : 'bg-gray-50 text-gray-400 italic'
                              }`}
                            >
                              <span className="truncate max-w-[170px]">{jA?.nombre_completo ?? (esAjuste ? 'Por Definir' : 'Esperando Ajuste...')}</span>
                              {ganadorId && ganadorId === jA?.id && (
                                <span className="text-[10px] text-green-700 font-extrabold ml-1">✓ GANÓ</span>
                              )}
                            </div>

                            {/* Jugador B */}
                            <div
                              className={`py-1.5 px-2.5 rounded-lg flex items-center justify-between text-xs transition ${
                                ganadorId && ganadorId === jB?.id
                                  ? 'bg-green-100 text-green-950 font-bold'
                                  : ganadorId && jB && ganadorId !== jB.id
                                  ? 'bg-gray-50 text-gray-400 line-through'
                                  : jB ? 'bg-gray-50 text-gray-900 font-medium' : 'bg-gray-50 text-gray-400 italic'
                              }`}
                            >
                              <span className="truncate max-w-[170px]">{jB?.nombre_completo ?? (esAjuste ? 'Por Definir' : 'Esperando Ajuste...')}</span>
                              {ganadorId && ganadorId === jB?.id && (
                                <span className="text-[10px] text-green-700 font-extrabold ml-1">✓ GANÓ</span>
                              )}
                            </div>

                            {/* Enlace directo a la partida */}
                            {partida && (
                              <div className="mt-2 pt-1.5 flex justify-end gap-2 border-t border-gray-100">
                                <Link
                                  to={`/partidas/${partida.id}/marcador`}
                                  className="text-[11px] text-primary-600 hover:text-primary-800 font-semibold"
                                >
                                  Ver Marcador →
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regenerar */}
          {hasRole('admin') && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de regenerar el cuadro? Se perderán las partidas generadas de llaves.')) {
                    generar.mutate();
                  }
                }}
                disabled={generar.isPending}
                className="text-xs text-gray-500 hover:text-red-600 transition flex items-center gap-1"
              >
                <span className="material-icons text-xs">refresh</span>
                Regenerar cuadro de llaves
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoading && (!data || data.rondas.length === 0) && !hasRole('admin') && (
        <div className="card-flat text-center py-12">
          <span className="material-icons text-5xl text-gray-300 block mb-3">account_tree</span>
          <p className="text-gray-500">El bracket aún no ha sido generado por la organización.</p>
        </div>
      )}
    </div>
  );
}
