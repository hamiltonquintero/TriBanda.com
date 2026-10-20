import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { BracketData, Fase, InfoClasificados } from '../../types';
import { useAuthStore } from '../../store/authStore';
import BilateralBracketView from './BilateralBracketView';

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const torneoId = id ?? '';
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [tamanoManual, setTamanoManual] = useState<number>(32); // Default a Cuadro de 32 (Playoffs 32 Oficial)
  const [viewMode, setViewMode] = useState<'bilateral' | 'clasica'>('bilateral');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icons text-primary-600">account_tree</span>
            Cuadro de Eliminación Directa
          </h1>
          <Link to={`/torneos/${torneoId}`} className="text-sm text-primary-600 hover:underline">
            ← Volver al torneo
          </Link>
        </div>

        {/* Selector de Vista: Bilateral vs Clásica */}
        {data && data.rondas.length > 0 && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm self-start sm:self-auto">
            <button
              onClick={() => setViewMode('bilateral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'bilateral'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-icons text-sm">view_timeline</span>
              Bilateral (Playoffs 32 TV)
            </button>
            <button
              onClick={() => setViewMode('clasica')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'clasica'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-icons text-sm">view_column</span>
              Clásica (Horizontal)
            </button>
          </div>
        )}
      </div>

      {/* Panel de generación — solo admin */}
      {hasRole('admin') && (!data || data.rondas.length === 0) && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <span className="material-icons">auto_fix_high</span>
            </span>
            <div>
              <h2 className="font-heading font-bold text-lg text-gray-900">
                Generar Cuadro de Eliminación (Playoffs Bilateral)
              </h2>
              <p className="text-xs text-gray-500">
                Soporta cruces automáticos, cabezas de serie oficiales y pases directos (BYEs).
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-2">
            <p className="font-semibold text-amber-950 flex items-center gap-1">
              <span className="material-icons text-sm">info</span>
              Resumen de Clasificados y Pases Directos (BYEs):
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-900/90">
              <li>
                Total de clasificados provenientes de grupos: <strong>{totalClasificados}</strong>
              </li>
              {totalClasificados <= 32 && totalClasificados > 16 && (
                <li>
                  En cuadro de 32: Las mejores <strong>{32 - (32 - totalClasificados) * 2}</strong> semillas reciben{' '}
                  <span className="font-bold text-emerald-800">Pase Directo a Octavos (BYE)</span>, y los puestos restantes
                  juegan los cruces de Dieciseisavos.
                </li>
              )}
              {totalClasificados === 32 && (
                <li>
                  <strong>32 clasificados exactos</strong>: Se llenan las 16 llaves completas de Dieciseisavos sin BYEs.
                </li>
              )}
              {totalClasificados < 16 && (
                <li>
                  Menos de 16 clasificados: Se ajusta automáticamente con pases directos a Cuartos u Octavos.
                </li>
              )}
            </ul>
          </div>

          <div>
            <label className="label">Formato del Cuadro</label>
            <select
              value={tamanoManual}
              onChange={(e) => setTamanoManual(Number(e.target.value))}
              className="input max-w-md font-medium"
            >
              <option value={32}>Cuadro de 32 (Oficial Playoffs 32 — con Pases Directos si hay &lt; 32)</option>
              <option value={16}>Cuadro de 16 (Octavos de Final)</option>
              <option value={8}>Cuadro de 8 (Cuartos de Final)</option>
              <option value={0}>Automático (según número de clasificados)</option>
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
            <p className="error text-xs">
              {(generar.error as any)?.response?.data?.error ?? (generar.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Bracket visual */}
      {isLoading && <p className="text-gray-500">Cargando bracket...</p>}

      {!isLoading && data && data.rondas.length > 0 && (
        <div className="space-y-6">
          {/* MODO 1: VISTA BILATERAL (PLAYOFFS 32 TV) */}
          {viewMode === 'bilateral' ? (
            <BilateralBracketView bracket={data} torneoNombre={torneoId} />
          ) : (
            /* MODO 2: VISTA CLÁSICA HORIZONTAL */
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
                          <h3
                            className={`font-heading font-extrabold text-sm ${
                              esAjuste ? 'text-amber-900' : 'text-primary-700'
                            }`}
                          >
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
                            const isA_Bye = Boolean(jA && !jB && cruce.slot_a.semilla && !partida);
                            const isB_Bye = Boolean(jB && !jA && cruce.slot_b.semilla && !partida);

                            return (
                              <div
                                key={idx}
                                className={`rounded-xl border shadow-sm p-3 transition ${
                                  esAjuste
                                    ? 'bg-white border-amber-200'
                                    : 'bg-white border-gray-200 hover:border-primary-300'
                                }`}
                              >
                                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5 pb-1 border-b border-gray-100">
                                  <span>Match #{idx + 1}</span>
                                  {partida ? (
                                    <span
                                      className={`font-semibold ${
                                        partida.estado === 'finalizada'
                                          ? 'text-green-600'
                                          : partida.estado === 'en_curso'
                                          ? 'text-amber-600 animate-pulse'
                                          : 'text-gray-400'
                                      }`}
                                    >
                                      {partida.estado === 'finalizada'
                                        ? 'Finalizada'
                                        : partida.estado === 'en_curso'
                                        ? 'En Vivo'
                                        : 'Pendiente'}
                                    </span>
                                  ) : isA_Bye || isB_Bye ? (
                                    <span className="text-emerald-600 font-bold">Pase a Octavos ✓</span>
                                  ) : null}
                                </div>

                                {/* Jugador A */}
                                <div
                                  className={`py-1.5 px-2.5 rounded-lg flex items-center justify-between text-xs mb-1 transition ${
                                    ganadorId && ganadorId === jA?.id
                                      ? 'bg-green-100 text-green-950 font-bold'
                                      : ganadorId && jA && ganadorId !== jA.id
                                      ? 'bg-gray-50 text-gray-400 line-through'
                                      : jA
                                      ? 'bg-gray-50 text-gray-900 font-medium'
                                      : 'bg-gray-50 text-gray-400 italic'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                                    {cruce.slot_a.semilla && (
                                      <span className="w-4 h-4 rounded bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center font-mono">
                                        {cruce.slot_a.semilla}
                                      </span>
                                    )}
                                    <span className="truncate">
                                      {jA?.nombre_completo ??
                                        (isB_Bye ? '[ Pase Directo / BYE ]' : 'Esperando clasificado...')}
                                    </span>
                                  </div>
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
                                      : jB
                                      ? 'bg-gray-50 text-gray-900 font-medium'
                                      : 'bg-gray-50 text-gray-400 italic'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                                    {cruce.slot_b.semilla && (
                                      <span className="w-4 h-4 rounded bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center font-mono">
                                        {cruce.slot_b.semilla}
                                      </span>
                                    )}
                                    <span className="truncate">
                                      {jB?.nombre_completo ??
                                        (isA_Bye ? '[ Pase Directo / BYE ]' : 'Esperando clasificado...')}
                                    </span>
                                  </div>
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
            </div>
          )}

          {/* Regenerar */}
          {hasRole('admin') && (
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => {
                  if (
                    confirm(
                      '¿Estás seguro de regenerar el cuadro de llaves? Se reiniciarán las partidas y cruces de la fase eliminatoria.'
                    )
                  ) {
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
