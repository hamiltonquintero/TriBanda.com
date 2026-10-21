import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Grupo, FilaTabla, InfoClasificados, InscripcionTorneo } from '../../types';

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

  const eliminarGrupoMut = useMutation({
    mutationFn: (grupoId: string) => api.delete(`/grupos/${grupoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos', faseId] });
      qc.invalidateQueries({ queryKey: ['clasificados-fase', faseId] });
      alert('Grupo eliminado correctamente.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al eliminar el grupo');
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

  function exportarImprimirTablaGeneral() {
    if (!infoClasificados || !infoClasificados.tabla_general || infoClasificados.tabla_general.length === 0) {
      alert('Aún no hay jugadores clasificados para generar la lista general.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaHoy = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const pasanDirecto = infoClasificados.esquema_ajuste?.clasificados_directos_count ?? 0;
    const jueganAjuste = infoClasificados.esquema_ajuste?.juegan_ajuste_count ?? 0;
    const potencia = infoClasificados.esquema_ajuste?.potencia_objetivo ?? 0;

    const filasHtml = infoClasificados.tabla_general.map((j, idx) => {
      const esDirecto = idx < pasanDirecto;
      return `
        <tr style="${esDirecto ? 'background-color: #ecfdf5;' : 'background-color: #fffbeb;'}">
          <td style="text-align: center; font-weight: 800; font-size: 11px;">${j.siembra_general}</td>
          <td style="font-weight: 700;">${j.nombre_completo}</td>
          <td style="color: #4b5563;">${j.club || '-'}</td>
          <td style="text-align: center; font-weight: 600;">G${j.grupo_numero} (${j.posicion_en_grupo}°)</td>
          <td style="text-align: center; font-weight: 800; font-size: 11px;">${j.puntos}</td>
          <td style="text-align: center; font-weight: 800; color: #166534; font-size: 11px;">${j.promedio.toFixed(3)}</td>
          <td style="text-align: center; color: #4b5563;">${j.promedio_particular ? j.promedio_particular.toFixed(3) : '-'}</td>
          <td style="text-align: center; font-weight: 600;">${j.mayor_serie ?? 0}</td>
          <td style="text-align: center;">${j.carambolas}</td>
          <td style="text-align: center;">${j.entradas}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; ${
              esDirecto
                ? 'background-color: #dcfce7; color: #166534; border: 1px solid #86efac;'
                : 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
            }">
              ${esDirecto ? '✓ PASE DIRECTO' : '⚡ JUEGA AJUSTE'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const crucesHtml = (infoClasificados.esquema_ajuste?.cruces_ajuste || []).map((c, i) => `
      <div style="border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 10px; background: white; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <span style="font-weight: 700; color: #b45309;">Partida Ajuste #${i + 1}</span>
        <span><strong>${c.jugador_a.nombre_completo}</strong> (${c.jugador_a.promedio.toFixed(3)}) <em style="color:#6b7280;">vs</em> <strong>${c.jugador_b.nombre_completo}</strong> (${c.jugador_b.promedio.toFixed(3)})</span>
      </div>
    `).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tabla General de Siembra & Ajuste - TriBanda</title>
          <style>
            @page { size: portrait; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; padding: 10px; }
            .header { border-bottom: 3px solid #166534; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 18px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
            .sub { font-size: 11px; color: #4b5563; margin-top: 2px; }
            .resumen-cajas { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
            .caja { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; text-align: center; background: #f9fafb; }
            .caja-val { font-size: 16px; font-weight: 800; color: #166534; }
            .caja-lbl { font-size: 9.5px; color: #4b5563; text-transform: uppercase; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px; }
            th { background: #166534; color: white; padding: 6px 4px; border: 1px solid #15803d; font-size: 9.5px; text-transform: uppercase; }
            td { padding: 5px 4px; border: 1px solid #e5e7eb; }
            .firmas { margin-top: 30px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; text-align: center; font-size: 11px; color: #374151; }
            .linea-firma { border-top: 1px solid #4b5563; margin-top: 40px; padding-top: 4px; font-weight: 600; }
            .footer { margin-top: 20px; text-align: center; font-size: 9.5px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">🎱 Lista General de Siembra & Ronda de Ajuste</div>
              <div class="sub">Orden Oficial UMB: Puntos → Prom. Gral → Prom. Part → Mayor Serie → Carambolas → Menos Entradas</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #4b5563;">
              <div>Fecha: <strong>${fechaHoy}</strong></div>
              <div>Formato: <strong>L. GENERAL</strong></div>
            </div>
          </div>

          <div class="resumen-cajas">
            <div class="caja">
              <div class="caja-val">${infoClasificados.tabla_general.length}</div>
              <div class="caja-lbl">Total Clasificados</div>
            </div>
            <div class="caja">
              <div class="caja-val">${potencia}</div>
              <div class="caja-lbl">Cuadro Principal</div>
            </div>
            <div class="caja" style="background: #ecfdf5; border-color: #86efac;">
              <div class="caja-val" style="color: #15803d;">${pasanDirecto}</div>
              <div class="caja-lbl" style="color: #166534;">Pasan Directo</div>
            </div>
            <div class="caja" style="background: #fffbeb; border-color: #fde68a;">
              <div class="caja-val" style="color: #b45309;">${jueganAjuste}</div>
              <div class="caja-lbl" style="color: #92400e;">Juegan Ajuste</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">Siembra</th>
                <th style="text-align: left;">Jugador</th>
                <th style="text-align: left;">Club</th>
                <th style="text-align: center;">Grupo / Pos</th>
                <th style="text-align: center;">Pts</th>
                <th style="text-align: center;">Prom. Gral</th>
                <th style="text-align: center;">Prom. Part</th>
                <th style="text-align: center;">M. Serie</th>
                <th style="text-align: center;">Car</th>
                <th style="text-align: center;">Ent</th>
                <th style="text-align: center; width: 100px;">Destino</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>

          ${crucesHtml ? `
            <div style="margin-top: 10px; margin-bottom: 20px;">
              <div style="font-weight: 800; font-size: 12px; color: #92400e; margin-bottom: 6px; text-transform: uppercase;">
                ⚡ Cruces Oficiales de la Ronda de Ajuste (${jueganAjuste / 2} Partidas):
              </div>
              ${crucesHtml}
            </div>
          ` : ''}

          <div class="firmas">
            <div>
              <div class="linea-firma">Director General del Torneo</div>
            </div>
            <div>
              <div class="linea-firma">Juez Árbitro Oficial</div>
            </div>
          </div>

          <div class="footer">
            Sistema Oficial TriBanda — Software Profesional de Billar a Tres Bandas • Desarrollado por Hamilton Quintero
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
          {infoClasificados?.tabla_general && infoClasificados.tabla_general.length > 0 && (
            <button
              onClick={exportarImprimirTablaGeneral}
              className="btn-outline text-xs text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 font-semibold shadow-2xs"
              title="Imprimir o exportar lista general de siembra (L. General) en formato listado"
            >
              <span className="material-icons text-sm">format_list_numbered</span>
              Exportar / Imprimir Tabla General
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

      {/* Banner de Guía Asistida en Grupos */}
      <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
            2
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                Paso 2: Fase de Grupos
              </span>
            </div>
            <p className="text-xs text-gray-700 mt-0.5">
              Haz clic en <strong>"🎲 Sorteo automático"</strong> arriba para repartir los jugadores en los grupos. Luego presiona <strong>"⚡ Autogenerar Partidas"</strong> para crear los enfrentamientos.
            </p>
          </div>
        </div>
        <Link
          to={`/torneos/${torneoId}`}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0 self-end sm:self-auto hover:underline"
        >
          ← Ver guía completa del torneo
        </Link>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {hasRole('admin') && (
                      <Link to={`/torneos/${torneoId}/fases/${faseId}/grupos/${grupo.id}/asignar`} className="btn-secondary text-xs">
                        Asignar jugadores
                      </Link>
                    )}
                    <Link to={`/torneos/${torneoId}/fases/${faseId}/grupos/${grupo.id}`} className="btn-primary text-xs">
                      Ver detalle y partidas
                    </Link>
                    {hasRole('admin') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`⚠️ ¿Deseas eliminar el Grupo ${grupo.numero}?`)) {
                            eliminarGrupoMut.mutate(grupo.id);
                          }
                        }}
                        disabled={eliminarGrupoMut.isPending}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar grupo"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-heading font-bold text-gray-900">
                  Lista General de Siembra (Orden Oficial)
                </h3>
                <p className="text-xs text-gray-500">Orden estricto por Puntos, Promedio General, Particular y Mayor Serie.</p>
              </div>
              <button
                type="button"
                onClick={exportarImprimirTablaGeneral}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
              >
                <span className="material-icons text-sm">print</span>
                <span>Imprimir Listado Oficial (L. General)</span>
              </button>
            </div>
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
          torneoId={torneoId!}
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

// ─── MODAL DE SORTEO CON JUGADORES INSCRITOS DEL TORNEO ──────────────────────

function SorteoModal({
  faseId,
  torneoId,
  gruposExistentes,
  onClose,
  onSuccess,
}: {
  faseId: string;
  torneoId: string;
  gruposExistentes: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [buscar, setBuscar] = useState('');
  const [filtroPago, setFiltroPago] = useState<'todos' | 'pagados' | 'pendientes'>('todos');
  const [jugadoresPorGrupo, setJugadoresPorGrupo] = useState<number>(3);

  // Obtener SOLO los jugadores inscritos en este torneo
  const { data: inscripciones = [], isLoading } = useQuery<InscripcionTorneo[]>({
    queryKey: ['inscripciones-torneo', torneoId],
    queryFn: () => api.get(`/inscripciones/${torneoId}`).then((r) => r.data),
  });

  // Conjunto de IDs seleccionados (por defecto todos los inscritos)
  const [seleccionadosIds, setSeleccionadosIds] = useState<Set<string>>(() => {
    try {
      const guardados = localStorage.getItem(`sorteo_ids_${faseId}`);
      if (guardados) return new Set(JSON.parse(guardados));
    } catch { /* noop */ }
    return new Set();
  });

  // Inicializar con todos los inscritos si no hay selección guardada previamente
  useEffect(() => {
    if (inscripciones.length > 0 && seleccionadosIds.size === 0) {
      const guardados = localStorage.getItem(`sorteo_ids_${faseId}`);
      if (!guardados) {
        setSeleccionadosIds(new Set(inscripciones.map((i) => i.jugador_id)));
      }
    }
  }, [inscripciones, faseId]);

  // Guardar selección progresivamente
  useEffect(() => {
    try {
      localStorage.setItem(`sorteo_ids_${faseId}`, JSON.stringify(Array.from(seleccionadosIds)));
    } catch { /* noop */ }
  }, [seleccionadosIds, faseId]);

  const toggleJugador = (id: string) => {
    setSeleccionadosIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const chulearTodos = () => {
    setSeleccionadosIds(new Set(inscripciones.map((i) => i.jugador_id)));
  };

  const chulearSoloPagados = () => {
    const pagados = inscripciones.filter((i) => i.pago_confirmado).map((i) => i.jugador_id);
    setSeleccionadosIds(new Set(pagados));
  };

  const desmarcarTodos = () => {
    setSeleccionadosIds(new Set());
  };

  // Filtrado de inscripciones para la lista visual
  const inscripcionesFiltradas = inscripciones.filter((ins) => {
    if (filtroPago === 'pagados' && !ins.pago_confirmado) return false;
    if (filtroPago === 'pendientes' && ins.pago_confirmado) return false;

    if (!buscar.trim()) return true;
    const q = buscar.toLowerCase();
    const nom = ins.jugador?.nombre_completo?.toLowerCase() || '';
    const ali = ins.jugador?.alias?.toLowerCase() || '';
    const club = ins.jugador?.club_ciudad?.toLowerCase() || '';
    const ced = ins.jugador?.cedula?.toLowerCase() || '';
    return nom.includes(q) || ali.includes(q) || club.includes(q) || ced.includes(q);
  });

  const totalInscritos = inscripciones.length;
  const totalPagados = inscripciones.filter((i) => i.pago_confirmado).length;
  const totalSeleccionados = seleccionadosIds.size;

  // Jugadores seleccionados completos para cálculos y sorteo
  const participantesSeleccionados = inscripciones.filter((i) => seleccionadosIds.has(i.jugador_id));

  // Reglas de grupos y clasificación UMB
  const clasificadosEstimados = jugadoresPorGrupo === 3 ? 2 : Math.floor(jugadoresPorGrupo / 2);
  const numGrupos = Math.ceil(totalSeleccionados / jugadoresPorGrupo);

  const sorteo = useMutation({
    mutationFn: async () => {
      const ids = Array.from(seleccionadosIds);
      if (ids.length < 2) {
        throw new Error('Debes seleccionar al menos 2 jugadores para el sorteo');
      }

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
        localStorage.removeItem(`sorteo_ids_${faseId}`);
      } catch { /* noop */ }
    },
    onSuccess,
  });

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
          <title>Listado Oficial de Participantes para Sorteo - TriBanda</title>
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
              <div class="meta">Listado Oficial de Jugadores Confirmados para Sorteo de Grupos</div>
            </div>
            <div class="meta" style="text-align: right;">
              <div>Fecha: <strong>${fechaHoy}</strong></div>
              <div>Participantes Seleccionados: <strong>${participantesSeleccionados.length}</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Nombre y Apellido</th>
                <th>Club / Procedencia</th>
                <th style="text-align: center; width: 90px;">Estado Pago</th>
                <th style="text-align: center; width: 80px;">Hándicap</th>
                <th style="text-align: center; width: 100px;">Firma / Mesa</th>
              </tr>
            </thead>
            <tbody>
              ${participantesSeleccionados.map((p, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td><strong>${p.jugador?.nombre_completo}</strong> ${p.jugador?.alias ? `<em>("${p.jugador.alias}")</em>` : ''}</td>
                  <td>${p.jugador?.club_ciudad || 'Sin Club'}</td>
                  <td style="text-align: center;">${p.pago_confirmado ? '✓ Pagado' : '⏳ Pendiente'}</td>
                  <td style="text-align: center;" class="badge">${p.meta_puntos || 30} pts</td>
                  <td style="text-align: center; color: #9ca3af;">[ &nbsp; ]</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generado por TRIBANDA — Software Profesional de Gestión de Billar a Tres Bandas
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-2xl max-h-[92vh] flex flex-col border border-gray-100">
        
        {/* Encabezado del modal */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-base">🎲</span>
              Sorteo Automático de Grupos
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Selecciona y chulea los jugadores <strong>inscritos en este torneo</strong> que participarán en el sorteo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Barra de estado y acciones rápidas de selección */}
        <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-800 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-2xs">
              🎯 {totalSeleccionados} seleccionados
            </span>
            <span className="text-gray-500">
              de {totalInscritos} inscritos ({totalPagados} con pago)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={chulearTodos}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs transition"
            >
              ✓ Chulear todos
            </button>
            <button
              type="button"
              onClick={chulearSoloPagados}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-xs font-semibold transition"
              title="Selecciona solo los que tienen el pago de inscripción confirmado"
            >
              💰 Solo pagados
            </button>
            <button
              type="button"
              onClick={desmarcarTodos}
              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 rounded-md text-xs font-medium transition"
            >
              Desmarcar
            </button>
          </div>
        </div>

        {/* Buscador + Filtros por estado de pago */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, alias, club o cédula..."
              className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="material-icons absolute left-2.5 top-2 text-gray-400 text-sm">search</span>
            {buscar && (
              <button
                onClick={() => setBuscar('')}
                className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFiltroPago('todos')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filtroPago === 'todos' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Todos ({totalInscritos})
            </button>
            <button
              type="button"
              onClick={() => setFiltroPago('pagados')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filtroPago === 'pagados' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pagados ({totalPagados})
            </button>
            <button
              type="button"
              onClick={() => setFiltroPago('pendientes')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filtroPago === 'pendientes' ? 'bg-amber-500 text-white shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pendientes ({totalInscritos - totalPagados})
            </button>
          </div>
        </div>

        {/* Ventana / Cuadro de selección de jugadores inscritos ("chuleo") */}
        <div className="mt-3 flex-1 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 sm:max-h-72 bg-white">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-400">Cargando jugadores inscritos...</div>
          ) : inscripcionesFiltradas.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No se encontraron jugadores con ese filtro en este torneo.
            </div>
          ) : (
            inscripcionesFiltradas.map((ins) => {
              const checked = seleccionadosIds.has(ins.jugador_id);
              const j = ins.jugador;
              return (
                <div
                  key={ins.id}
                  onClick={() => toggleJugador(ins.jugador_id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none transition ${
                    checked ? 'bg-emerald-50/70 hover:bg-emerald-100/60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // Manejado por onClick del contenedor
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {j?.nombre_completo ? j.nombre_completo.charAt(0).toUpperCase() : 'J'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{j?.nombre_completo}</span>
                        {j?.alias && <span className="text-gray-500 font-normal">"{j.alias}"</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        <span>{j?.club_ciudad || 'Sin Club'}</span>
                        {j?.categoria && (
                          <span className="text-gray-400">• Cat. {j.categoria}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      {ins.meta_puntos || 30} pts ({ins.nivel || 'Primera'})
                    </span>

                    {ins.pago_confirmado ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        <span>✓</span> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        <span>⏳</span> Pago Pendiente
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Configuración de tamaño de grupos y regla de clasificación */}
        {totalSeleccionados >= 2 && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Tamaño de los Grupos (Reglamento Oficial)
              </label>
              {totalSeleccionados > 0 && (
                <button
                  type="button"
                  onClick={imprimirListadoParticipantes}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
                  title="Imprimir listado oficial de confirmados"
                >
                  <span>🖨️</span> Imprimir planilla de participantes
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[3, 4, 6].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setJugadoresPorGrupo(size)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    jugadoresPorGrupo === size
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {size} jugadores por grupo
                </button>
              ))}
            </div>

            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <strong>Estructura generada:</strong> {numGrupos} grupo(s) de hasta {jugadoresPorGrupo} jugadores.
              </div>
              <div className="font-bold text-emerald-800">
                Clasifican {clasificadosEstimados} por grupo {jugadoresPorGrupo === 3 ? '(UMB)' : ''}
              </div>
            </div>
          </div>
        )}

        {sorteo.isError && (
          <p className="mt-2 text-xs font-medium text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
            {(sorteo.error as any)?.response?.data?.error ?? 'Error al sortear'}
          </p>
        )}

        {/* Botones de acción final */}
        <div className="flex gap-2 justify-end pt-3 mt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition">
            Cancelar
          </button>
          <button
            onClick={() => sorteo.mutate()}
            disabled={sorteo.isPending || totalSeleccionados < 2}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
          >
            {sorteo.isPending ? (
              <>
                <span className="material-icons animate-spin text-sm">autorenew</span>
                <span>Realizando Sorteo...</span>
              </>
            ) : (
              <>
                <span>🎲</span>
                <span>Ejecutar Sorteo ({totalSeleccionados} jugadores)</span>
              </>
            )}
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
