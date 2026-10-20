import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Grupo, FilaTabla, Jugador, InfoClasificados } from '../../types';

export default function GruposPage() {
  const { torneoId, faseId } = useParams<{ torneoId: string; faseId: string }>();
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [sorteoOpen, setSorteoOpen] = useState(false);
  const [tab, setTab] = useState<'grupos' | 'general'>('grupos');

  const { data: grupos, isLoading } = useQuery<Grupo[]>({
    queryKey: ['grupos', faseId],
    queryFn: () => api.get(`/grupos/${faseId}`).then((r) => r.data),
  });

  const { data: infoClasificados } = useQuery<InfoClasificados>({
    queryKey: ['clasificados-fase', faseId],
    queryFn: () => api.get(`/grupos/${faseId}/clasificados`).then((r) => r.data),
    enabled: !!faseId,
  });

  const crearGrupo = useMutation({
    mutationFn: (numero: number) => api.post('/grupos', { fase_id: faseId, numero }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['clasificados-fase', faseId] });
    },
  });

  const generarPartidas = useMutation({
    mutationFn: () => api.post(`/grupos/fase/${faseId}/generar-partidas`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['partidas'] });
      alert(`⚡ ¡Listo! Se generaron ${res.data.total_creadas} partidas automáticamente.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al generar partidas');
    },
  });

  const autoAsignarJueces = useMutation({
    mutationFn: () => api.post(`/grupos/fase/${faseId}/auto-asignar-jueces`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
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

  if (isLoading) return <p className="text-gray-500">Cargando grupos...</p>;
  const nextNumero = (grupos?.length ?? 0) + 1;

  function exportarImprimirGrupos() {
    if (!grupos || grupos.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaHoy = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const gruposHtml = grupos.map((g) => {
      const tabla = g.tabla || [];
      const filasHtml = tabla.map((f) => {
        const clasifica = f.posicion <= (infoClasificados?.clasificados_por_grupo ?? 2);
        return `
          <tr style="${clasifica ? 'background-color: #ecfdf5; font-weight: bold;' : ''}">
            <td style="text-align: center;">${clasifica ? `${f.posicion} ✓` : f.posicion}</td>
            <td>${f.nombre_completo}</td>
            <td style="color: #6b7280;">${f.club || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${f.puntos}</td>
            <td style="text-align: center; color: #15803d;">${f.promedio.toFixed(3)}</td>
            <td style="text-align: center;">${f.mayor_serie ?? 0}</td>
            <td style="text-align: center;">${f.carambolas}</td>
            <td style="text-align: center;">${f.entradas}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="grupo-card">
          <div class="grupo-header">
            <strong>GRUPO ${g.numero} ${g.letra ? `— ${g.letra}` : ''}</strong>
            <span style="font-size: 10px; color: #bbf7d0;">Clasifican ${infoClasificados?.clasificados_por_grupo ?? 2}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">Pos</th>
                <th>Jugador</th>
                <th>Club</th>
                <th style="text-align: center;">Pts</th>
                <th style="text-align: center;">Prom</th>
                <th style="text-align: center;">Ser</th>
                <th style="text-align: center;">CAR</th>
                <th style="text-align: center;">ENT</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml || '<tr><td colspan="8" style="text-align:center; color:#9ca3af;">Sin participantes</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cartelera Oficial de Grupos - TriBanda</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; padding: 12px; }
            .header { border-bottom: 3px solid #166534; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
            .sub { font-size: 11px; color: #4b5563; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .grupo-card { border: 1.5px solid #d1d5db; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
            .grupo-header { background: #166534; color: white; padding: 6px 10px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th { background: #f3f4f6; color: #374151; padding: 4px 6px; border-bottom: 1px solid #d1d5db; font-size: 10px; }
            td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
            .footer { margin-top: 14px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">🎱 Cartelera Oficial de Grupos y Posiciones</div>
              <div class="sub">Torneo de Billar a Tres Bandas — Fase Clasificatoria</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #4b5563;">
              <div>Fecha: <strong>${fechaHoy}</strong></div>
              <div>Total Grupos: <strong>${grupos.length}</strong></div>
            </div>
          </div>

          <div class="grid">
            ${gruposHtml}
          </div>

          <div class="footer">
            Sistema Oficial TriBanda — Gestión de Torneos de Billar a Tres Bandas • Impresión Oficial
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(docHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            <span className="material-icons text-primary-600 align-middle mr-2">groups</span>
            Fase de Grupos
          </h1>
          <Link to={`/torneos/${torneoId}`} className="text-sm text-primary-600 hover:underline">← Volver al torneo</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {grupos && grupos.length > 0 && (
            <button
              onClick={exportarImprimirGrupos}
              className="btn-outline text-xs text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1 shadow-2xs"
              title="Imprimir o exportar cartelera de grupos en PDF"
            >
              <span className="material-icons text-sm">print</span>
              Exportar / Imprimir Grupos
            </button>
          )}
          {hasRole('admin') && (
            <>
              <button
                onClick={() => setSorteoOpen(true)}
                className="btn-primary text-xs flex items-center gap-1 shadow-sm"
              >
                <span>🎲</span> Sorteo automático
              </button>

              <button
                onClick={() => generarPartidas.mutate()}
                disabled={generarPartidas.isPending}
                className="btn-outline text-xs text-primary-700 border-primary-400 bg-primary-50/50 hover:bg-primary-100 flex items-center gap-1 font-semibold"
                title="Genera automáticamente las partidas de todos los grupos"
              >
                <span className="material-icons text-sm">auto_awesome</span>
                {generarPartidas.isPending ? 'Generando...' : '⚡ Autogenerar Partidas'}
              </button>

              <button
                onClick={() => autoAsignarJueces.mutate()}
                disabled={autoAsignarJueces.isPending}
                className="btn-secondary text-xs flex items-center gap-1"
                title="Asigna automáticamente Juez Mesa 1 al Grupo 1, Juez Mesa 2 al Grupo 2, etc."
              >
                <span className="material-icons text-sm">balance</span>
                {autoAsignarJueces.isPending ? 'Asignando...' : '⚖️ Auto-asignar Mesas / Jueces'}
              </button>

              <button
                onClick={() => crearGrupo.mutate(nextNumero)}
                disabled={crearGrupo.isPending}
                className="btn-outline text-xs text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                + Nuevo grupo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs: Por grupos vs Tabla general clasificados */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('grupos')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'grupos' ? 'bg-primary-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          🏆 Grupos Individuales ({grupos?.length ?? 0})
        </button>
        <button
          onClick={() => setTab('general')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'general' ? 'bg-primary-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          📋 Tabla General de Siembra & Ajuste ({infoClasificados?.total_clasificados ?? 0})
        </button>
      </div>

      {tab === 'grupos' && (
        <>
          {(!grupos || grupos.length === 0) && (
            <p className="text-gray-400 text-center py-12">No hay grupos creados en esta fase.</p>
          )}

          <div className="grid gap-6">
            {grupos?.map((grupo) => (
              <div key={grupo.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-semibold text-lg text-gray-900">
                      Grupo {grupo.numero}{grupo.letra ? ` — ${grupo.letra}` : ''}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Desempate oficial: Puntos → Prom. Gral → Prom. Ind. → Mayor Serie → CAR
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasRole('admin') && (
                      <Link to={`/torneos/${torneoId}/fases/${faseId}/grupos/${grupo.id}/asignar`} className="btn-secondary text-xs">Asignar jugadores</Link>
                    )}
                    <Link to={`/torneos/${torneoId}/fases/${faseId}/grupos/${grupo.id}`} className="btn-primary text-xs">Ver detalle y partidas</Link>
                  </div>
                </div>
                {grupo.jugadores.length === 0 ? (
                  <p className="text-gray-400 text-sm">Sin jugadores asignados.</p>
                ) : (
                  <TablaGrupo tabla={grupo.tabla ?? []} clasificadosPorGrupo={infoClasificados?.clasificados_por_grupo ?? 2} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'general' && infoClasificados && (
        <div className="space-y-6">
          {/* Resumen del esquema de ajuste */}
          <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-heading font-bold mb-2">
              <span className="material-icons align-middle mr-2 text-accent-400">tune</span>
              Esquema de Clasificación y Ronda de Ajuste (Regla Oficial)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-green-200">Total Clasificados</p>
                <p className="text-2xl font-extrabold">{infoClasificados.total_clasificados}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-green-200">Cuadro Principal (Potencia)</p>
                <p className="text-2xl font-extrabold">{infoClasificados.esquema_ajuste.potencia_objetivo}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-green-200">Pasan Directo al Cuadro</p>
                <p className="text-2xl font-extrabold text-accent-300">
                  {infoClasificados.esquema_ajuste.clasificados_directos_count}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-green-200">Juegan Ronda de Ajuste</p>
                <p className="text-2xl font-extrabold text-amber-300">
                  {infoClasificados.esquema_ajuste.juegan_ajuste_count}
                </p>
              </div>
            </div>

            {infoClasificados.esquema_ajuste.sobrantes > 0 ? (
              <p className="text-xs text-green-100 mt-3">
                ⚡ Se juegan <strong>{infoClasificados.esquema_ajuste.sobrantes}</strong> partidas de ajuste entre los {infoClasificados.esquema_ajuste.juegan_ajuste_count} de menor promedio. Los ganadores completan los cupos de la Ronda de {infoClasificados.esquema_ajuste.potencia_objetivo}.
              </p>
            ) : (
              <p className="text-xs text-green-100 mt-3">
                ✓ El número de clasificados ({infoClasificados.total_clasificados}) coincide con la potencia de 2. No se requiere ronda de ajuste.
              </p>
            )}
          </div>

          {/* Tabla unificada general */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-heading font-bold text-gray-900 mb-3">
              Lista General de Siembra (Orden Oficial)
            </h3>
            <div className="overflow-x-auto">
              <table className="table-billar">
                <thead>
                  <tr>
                    <th>Siembra</th>
                    <th>Jugador</th>
                    <th>Club</th>
                    <th className="text-center">Pos. Grupo</th>
                    <th className="text-center">Pts</th>
                    <th className="text-center">Prom. Gral</th>
                    <th className="text-center">Prom. Ind.</th>
                    <th className="text-center">M. Serie</th>
                    <th className="text-center">CAR</th>
                    <th className="text-center">ENT</th>
                    <th>Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {infoClasificados.tabla_general.map((j) => {
                    const esDirecto = j.siembra_general <= infoClasificados.esquema_ajuste.clasificados_directos_count;
                    return (
                      <tr key={j.jugador_id} className={esDirecto ? 'bg-green-50/50' : 'bg-amber-50/50'}>
                        <td className="font-bold text-center">{j.siembra_general}</td>
                        <td className="font-medium">{j.nombre_completo}</td>
                        <td className="text-gray-500">{j.club}</td>
                        <td className="text-center text-xs font-semibold">
                          G{j.grupo_numero} ({j.posicion_en_grupo}°)
                        </td>
                        <td className="text-center font-bold">{j.puntos}</td>
                        <td className="text-center font-bold text-primary-700">{j.promedio.toFixed(3)}</td>
                        <td className="text-center text-xs text-gray-600">
                          {j.promedio_particular ? j.promedio_particular.toFixed(3) : '-'}
                        </td>
                        <td className="text-center font-semibold text-accent-700">
                          {j.mayor_serie ?? 0}
                        </td>
                        <td className="text-center">{j.carambolas}</td>
                        <td className="text-center">{j.entradas}</td>
                        <td>
                          {esDirecto ? (
                            <span className="badge-green text-xs">Pase directo</span>
                          ) : (
                            <span className="badge-amber text-xs">Juega Ajuste</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {sorteoOpen && (
        <SorteoModal
          faseId={faseId!}
          gruposExistentes={grupos?.length ?? 0}
          onClose={() => setSorteoOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['grupos', faseId] });
            qc.invalidateQueries({ queryKey: ['clasificados-fase', faseId] });
            setSorteoOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── MODAL DE SORTEO CON BUSCADOR ───────────────────────────────────────────

function SorteoModal({ faseId, gruposExistentes, onClose, onSuccess }: {
  faseId: string; gruposExistentes: number; onClose: () => void; onSuccess: () => void;
}) {
  const [buscar, setBuscar] = useState('');
  const [participantes, setParticipantes] = useState<Jugador[]>(() => {
    try {
      const guardados = localStorage.getItem(`sorteo_participantes_${faseId}`);
      return guardados ? JSON.parse(guardados) : [];
    } catch {
      return [];
    }
  });
  const [jugadoresPorGrupo, setJugadoresPorGrupo] = useState<number>(3);

  // Guardar participantes progresivamente
  useEffect(() => {
    try {
      localStorage.setItem(`sorteo_participantes_${faseId}`, JSON.stringify(participantes));
    } catch { /* noop */ }
  }, [participantes, faseId]);

  const { data: jugadores = [] } = useQuery<Jugador[]>({
    queryKey: ['jugadores-activos', buscar],
    queryFn: () => api.get('/jugadores', { params: { activo: true, buscar: buscar || undefined } }).then((r) => r.data),
  });

  // Regla UMB: En grupos de 3 clasifican 2 (los dos mejores). En grupos de 4 clasifican 2.
  const clasificadosEstimados = jugadoresPorGrupo === 3 ? 2 : Math.floor(jugadoresPorGrupo / 2);
  const numGrupos = Math.ceil(participantes.length / jugadoresPorGrupo);

  const sorteo = useMutation({
    mutationFn: async () => {
      const ids = participantes.map((j) => j.id);

      // Crear grupos si no hay suficientes
      if (gruposExistentes < numGrupos) {
        for (let i = gruposExistentes + 1; i <= numGrupos; i++) {
          await api.post('/grupos', { fase_id: faseId, numero: i });
        }
      }

      await api.post(`/grupos/${faseId}/sorteo`, {
        fase_id: faseId,
        jugador_ids: ids,
        clasificados_por_grupo: clasificadosEstimados,
      });

      // Generar automáticamente las partidas round robin y auto-asignar jueces
      try {
        await api.post(`/grupos/fase/${faseId}/generar-partidas`);
        await api.post(`/grupos/fase/${faseId}/auto-asignar-jueces`);
      } catch { /* si ya existen o no hay jueces */ }

      // Limpiar borrador temporal guardado
      try {
        localStorage.removeItem(`sorteo_participantes_${faseId}`);
      } catch { /* noop */ }
    },
    onSuccess,
  });

  function agregarJugador(j: Jugador) {
    if (!participantes.find((p) => p.id === j.id)) {
      setParticipantes([...participantes, j]);
    }
    setBuscar('');
  }

  function quitarJugador(id: string) {
    setParticipantes(participantes.filter((p) => p.id !== id));
  }

  function imprimirListadoParticipantes() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaHoy = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Listado Oficial de Participantes - TriBanda</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111827; }
            .header { border-bottom: 3px solid #15803d; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: bold; color: #166534; text-transform: uppercase; }
            .meta { font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th { background: #f3f4f6; color: #374151; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #d1d5db; }
            td { padding: 8px 10px; border: 1px solid #e5e7eb; }
            tr:nth-child(even) { background: #f9fafb; }
            .badge { font-weight: bold; color: #15803d; }
            .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">🎱 Torneo de Billar a Tres Bandas</div>
              <div class="meta">Listado Oficial de Jugadores Inscritos para Sorteo</div>
            </div>
            <div class="meta" style="text-align: right;">
              <div>Fecha: <strong>${fechaHoy}</strong></div>
              <div>Total Inscritos: <strong>${participantes.length}</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Nombre y Apellido</th>
                <th>Club / Procedencia</th>
                <th style="text-align: center; width: 80px;">Hándicap</th>
                <th style="text-align: center; width: 100px;">Firma / Check</th>
              </tr>
            </thead>
            <tbody>
              ${participantes.map((p, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td><strong>${p.nombre_completo}</strong> ${p.alias ? `<em>("${p.alias}")</em>` : ''}</td>
                  <td>${p.club_ciudad || 'Sin Club'}</td>
                  <td style="text-align: center;" class="badge">${(p as any).meta_puntos || 30} pts</td>
                  <td style="text-align: center; color: #9ca3af;">[ &nbsp; ]</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generado por TRIBANDA — Software de Gestión de Torneos de Billar a Tres Bandas
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  const disponibles = jugadores.filter((j) => !participantes.find((p) => p.id === j.id));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <span>🎲</span> Sorteo automático y Creación de Partidas
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>

        {/* Buscador */}
        <div className="mb-4">
          <label className="label font-semibold text-xs uppercase text-gray-600">Buscar y agregar jugadores</label>
          <input
            type="text" value={buscar} onChange={(e) => setBuscar(e.target.value)}
            placeholder="Escribe nombre, alias o cédula..."
            className="input"
          />
          {buscar.length >= 2 && disponibles.length > 0 && (
            <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto shadow-sm">
              {disponibles.slice(0, 10).map((j) => (
                <button key={j.id} onClick={() => agregarJugador(j)}
                  className="w-full text-left px-3 py-2 hover:bg-primary-50 text-sm flex justify-between items-center border-b last:border-0">
                  <span className="font-medium">{j.nombre_completo} {j.alias ? `"${j.alias}"` : ''}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{j.club_ciudad}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de participantes con guardado progresivo */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="label font-semibold text-xs uppercase text-gray-600 mb-0">
              Participantes Inscritos ({participantes.length})
            </label>
            {participantes.length > 0 && (
              <button
                type="button"
                onClick={imprimirListadoParticipantes}
                className="text-xs text-primary-700 hover:text-primary-800 font-bold flex items-center gap-1 underline"
                title="Imprimir o exportar a PDF con membrete oficial"
              >
                <span>🖨️</span> Imprimir / Ver listado
              </button>
            )}
          </div>

          {participantes.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">Busca y agrega participantes. Se irán guardando automáticamente.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-xl p-2 bg-gray-50/50">
              {participantes.map((j, i) => (
                <div key={j.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
                  <span className="font-medium text-gray-800">
                    <strong className="text-gray-400 mr-1.5">{i + 1}.</strong>
                    {j.nombre_completo}
                    <span className="text-gray-400 font-normal ml-1.5">— {j.club_ciudad}</span>
                  </span>
                  <button onClick={() => quitarJugador(j.id)} className="text-red-500 hover:text-red-700 font-bold text-xs p-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuración de tamaño de grupos y regla de clasificación */}
        {participantes.length >= 2 && (
          <div className="mb-5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="label font-semibold text-xs uppercase text-gray-700">Tamaño de grupos (Reglamento)</label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 4, 6].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setJugadoresPorGrupo(size)}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    jugadoresPorGrupo === size
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {size} jugadores
                </button>
              ))}
            </div>
            <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-tight">
              <strong>Regla Oficial:</strong> Se crearán {numGrupos} grupo(s) de hasta {jugadoresPorGrupo} jugadores.
              <span className="font-bold text-emerald-700 block mt-0.5">
                Clasifican {clasificadosEstimados} por grupo {jugadoresPorGrupo === 3 ? '(en grupos de 3 clasifican 2)' : ''}.
              </span>
            </div>
          </div>
        )}

        {sorteo.isError && (
          <p className="error mb-3">{(sorteo.error as any)?.response?.data?.error ?? 'Error al sortear'}</p>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => sorteo.mutate()}
            disabled={sorteo.isPending || participantes.length < 2}
            className="btn-primary"
          >
            {sorteo.isPending ? 'Sorteando...' : `Sortear ${participantes.length} jugadores`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TablaGrupo({ tabla, clasificadosPorGrupo = 2 }: { tabla: FilaTabla[]; clasificadosPorGrupo?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-billar">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Nombre</th>
            <th>Club</th>
            <th className="text-center">Pts</th>
            <th className="text-center">Prom. Gral</th>
            <th className="text-center">Prom. Ind.</th>
            <th className="text-center">M. Serie</th>
            <th className="text-center">CAR</th>
            <th className="text-center">ENT</th>
            <th className="text-center">Sets</th>
          </tr>
        </thead>
        <tbody>
          {tabla.map((fila) => {
            const clasifica = fila.posicion <= clasificadosPorGrupo;
            return (
              <tr key={fila.jugador_id} className={clasifica ? 'bg-green-50/70 font-semibold' : ''}>
                <td className="font-bold">
                  {clasifica ? (
                    <span className="inline-flex items-center gap-1">
                      {fila.posicion}
                      <span className="badge-green text-[10px] px-1.5 py-0.5">✓</span>
                    </span>
                  ) : fila.posicion}
                </td>
                <td className="font-medium">{fila.nombre_completo}</td>
                <td className="text-gray-500">{fila.club}</td>
                <td className="text-center font-bold text-gray-900">{fila.puntos}</td>
                <td className="text-center font-bold text-primary-700">{fila.promedio.toFixed(3)}</td>
                <td className="text-center text-xs text-gray-600">
                  {fila.promedio_particular ? fila.promedio_particular.toFixed(3) : '-'}
                </td>
                <td className="text-center font-semibold text-accent-700">{fila.mayor_serie ?? 0}</td>
                <td className="text-center">{fila.carambolas}</td>
                <td className="text-center">{fila.entradas}</td>
                <td className="text-center text-xs text-gray-500">
                  {fila.sets_ganados}-{fila.sets_perdidos}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
