import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Jugador } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function JugadoresPage() {
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [soloActivos, setSoloActivos] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [vista, setVista] = useState<'tarjetas' | 'tabla'>('tabla');

  const { data: jugadores = [], isLoading } = useQuery<Jugador[]>({
    queryKey: ['jugadores', soloActivos, buscar],
    queryFn: () =>
      api.get('/jugadores', {
        params: {
          activo: soloActivos,
          ...(buscar && { buscar }),
        },
      }).then((r) => r.data),
  });

  const desactivar = useMutation({
    mutationFn: (id: string) => api.patch(`/jugadores/${id}/desactivar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jugadores'] }),
  });

  function exportarImprimirDirectorio() {
    if (jugadores.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaHoy = new Date().toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const filasHtml = jugadores
      .map(
        (j, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td>${j.cedula || '-'}</td>
          <td><strong>${j.nombre_completo}</strong></td>
          <td style="color: #4b5563;">${j.alias ? `"${j.alias}"` : '-'}</td>
          <td>${j.club?.nombre ?? j.club_ciudad}</td>
          <td>${j.ciudad || '-'}</td>
          <td style="text-align: center; font-weight: bold; color: #166534;">
            ${j.promedio_historico ? j.promedio_historico.toFixed(3) : '0.000'}
          </td>
          <td style="text-align: center;">${j.celular || '-'}</td>
          <td style="text-align: center;">${j.activo ? 'Activo' : 'Inactivo'}</td>
        </tr>
      `
      )
      .join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Directorio Oficial de Jugadores - TriBanda</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; padding: 12px; }
            .header { border-bottom: 3px solid #166534; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: 800; color: #166534; text-transform: uppercase; }
            .sub { font-size: 11px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            th { background: #f3f4f6; color: #374151; padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; }
            td { padding: 6px 8px; border: 1px solid #e5e7eb; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 16px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">🎱 Directorio Oficial de Jugadores</div>
              <div class="sub">TriBanda — Registro Nacional de Billar a Tres Bandas</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #4b5563;">
              <div>Fecha: <strong>${fechaHoy}</strong></div>
              <div>Total Jugadores: <strong>${jugadores.length}</strong></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Cédula</th>
                <th>Nombre Completo</th>
                <th>Alias</th>
                <th>Club / Ciudad</th>
                <th>Ciudad</th>
                <th style="text-align: center;">Promedio</th>
                <th style="text-align: center;">Celular</th>
                <th style="text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
          <div class="footer">
            Sistema Oficial TriBanda — Software Especializado de Billar a Tres Bandas
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icons text-primary-600">group</span>
            Directorio de Jugadores
          </h1>
          <p className="text-xs text-gray-500">
            Registro de billaristas, categorías, promedios históricos y clubes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {jugadores.length > 0 && (
            <button
              onClick={exportarImprimirDirectorio}
              className="btn-outline text-xs text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1 shadow-2xs"
              title="Exportar o imprimir directorio de jugadores"
            >
              <span className="material-icons text-sm">print</span>
              Imprimir Directorio
            </button>
          )}

          {hasRole('admin') && (
            <Link to="/jugadores/nuevo" className="btn-primary text-xs flex items-center gap-1">
              <span className="material-icons text-sm">person_add</span>
              Registrar Jugador
            </Link>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Modo de Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, alias o cédula..."
              className="input text-xs pl-8"
            />
            <span className="material-icons text-gray-400 text-sm absolute left-2.5 top-2.5">search</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="accent-primary-600 rounded"
            />
            Solo activos
          </label>

          <span className="text-xs text-gray-400 font-medium">
            {jugadores.length} {jugadores.length === 1 ? 'jugador' : 'jugadores'}
          </span>
        </div>

        {/* Toggle Vista */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setVista('tabla')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 ${
              vista === 'tabla' ? 'bg-white text-gray-900 shadow-2xs font-semibold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-icons text-xs">table_rows</span>
            Tabla
          </button>
          <button
            type="button"
            onClick={() => setVista('tarjetas')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition flex items-center gap-1 ${
              vista === 'tarjetas' ? 'bg-white text-gray-900 shadow-2xs font-semibold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="material-icons text-xs">grid_view</span>
            Tarjetas
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500 text-center py-12 text-sm">Cargando directorio...</p>}

      {!isLoading && jugadores.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-4xl mb-2">👤</p>
          <p className="text-gray-600 font-medium text-sm">No se encontraron jugadores.</p>
          {hasRole('admin') && (
            <Link to="/jugadores/nuevo" className="mt-3 inline-block btn-primary text-xs">
              Registrar el primer jugador
            </Link>
          )}
        </div>
      )}

      {/* VISTA 1: TABLA COMPACTA (Pantallazo 6 del Cliente) */}
      {!isLoading && jugadores.length > 0 && vista === 'tabla' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="table-billar text-xs">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>Nombre Completo</th>
                <th>Club / Sede</th>
                <th>Cédula</th>
                <th>Celular</th>
                <th className="text-center">Prom. Histórico</th>
                <th className="text-center">Categoría</th>
                <th className="text-center">Estado</th>
                {hasRole('admin') && <th className="text-center w-28">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j, idx) => {
                const promedio = j.promedio_historico ?? 0;
                let categoriaBadge = { label: 'Tercera', color: 'badge-amber' };
                if (promedio >= 0.8) {
                  categoriaBadge = { label: 'Primera', color: 'badge-green' };
                } else if (promedio >= 0.5) {
                  categoriaBadge = { label: 'Segunda', color: 'badge-blue' };
                }

                return (
                  <tr key={j.id} className="hover:bg-gray-50 transition">
                    <td className="text-center font-bold text-gray-400">{idx + 1}</td>
                    <td>
                      <Link
                        to={`/publico/jugador/${j.id}`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {j.nombre_completo}
                      </Link>
                      {j.alias && <span className="text-gray-400 italic ml-1">"{j.alias}"</span>}
                    </td>
                    <td className="text-gray-600">{j.club?.nombre ?? j.club_ciudad}</td>
                    <td className="text-gray-500 font-mono text-[11px]">{j.cedula || '-'}</td>
                    <td className="text-gray-500 font-mono text-[11px]">{j.celular || '-'}</td>
                    <td className="text-center font-bold font-mono text-primary-700">
                      {promedio.toFixed(3)}
                    </td>
                    <td className="text-center">
                      <span className={`${categoriaBadge.color} text-[10px] px-2 py-0.5`}>
                        {categoriaBadge.label}
                      </span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          j.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {j.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {hasRole('admin') && (
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/jugadores/${j.id}/editar`}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            Editar
                          </Link>
                          {j.activo && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Desactivar al jugador ${j.nombre_completo}?`)) {
                                  desactivar.mutate(j.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 font-medium"
                            >
                              Baja
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VISTA 2: GRID DE TARJETAS */}
      {!isLoading && jugadores.length > 0 && vista === 'tarjetas' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jugadores.map((j) => (
            <div key={j.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-lg border border-primary-200 flex-shrink-0">
                  {j.nombre_completo.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/publico/jugador/${j.id}`}
                    className="font-semibold text-sm hover:text-primary-600 block truncate text-gray-900"
                  >
                    {j.nombre_completo}
                  </Link>
                  {j.alias && <p className="text-xs text-gray-400 italic">"{j.alias}"</p>}
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <p className="truncate">🏛️ {j.club?.nombre ?? j.club_ciudad}</p>
                {j.cedula && <p>🪪 {j.cedula}</p>}
                {j.celular && <p>📱 {j.celular}</p>}
                <p className="font-semibold text-primary-700 pt-1">
                  Promedio: {j.promedio_historico ? j.promedio_historico.toFixed(3) : '0.000'}
                </p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    j.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {j.activo ? 'Activo' : 'Inactivo'}
                </span>
                {hasRole('admin') && (
                  <div className="flex gap-2 text-xs">
                    <Link to={`/jugadores/${j.id}/editar`} className="text-primary-600 hover:underline">
                      Editar
                    </Link>
                    {j.activo && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Desactivar al jugador ${j.nombre_completo}?`)) {
                            desactivar.mutate(j.id);
                          }
                        }}
                        className="text-red-500 hover:underline"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
