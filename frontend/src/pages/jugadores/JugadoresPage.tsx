import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Jugador } from '../../types';
import { useAuthStore } from '../../store/authStore';
import ModalImportarExcel from '../../components/ModalImportarExcel';

export default function JugadoresPage() {
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [soloActivos, setSoloActivos] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [vista, setVista] = useState<'tarjetas' | 'tabla'>('tabla');
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);

  const { data: rawJugadores = [], isLoading } = useQuery<Jugador[]>({
    queryKey: ['jugadores', soloActivos, buscar],
    queryFn: () =>
      api.get('/jugadores', {
        params: {
          activo: soloActivos,
          ...(buscar && { buscar }),
        },
      }).then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  const jugadores = Array.isArray(rawJugadores) ? rawJugadores : [];

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
        (j, idx) => {
          let handicap = '3';
          if (j.categoria?.includes('1') || (j.promedio_historico ?? 0) >= 0.8) handicap = '1';
          else if (j.categoria?.includes('2') || (j.promedio_historico ?? 0) >= 0.5) handicap = '2';

          return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td><strong>${j.nombre_completo}</strong></td>
            <td style="text-align: center; font-weight: bold; color: #166534;">${handicap}</td>
            <td style="color: #4b5563;">${j.alias ? `"${j.alias}"` : '-'}</td>
            <td>${j.cedula || '-'}</td>
            <td>${j.club?.nombre ?? j.club_ciudad}</td>
            <td>${j.ciudad || (j.club?.ciudad ?? '-')}</td>
            <td style="text-align: center;">${j.celular || '-'}</td>
            <td style="text-align: center;">${j.activo ? 'Activo' : 'Inactivo'}</td>
          </tr>
        `;
        }
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
                <th style="width: 35px; text-align: center;">ID</th>
                <th>NOMBRE Y APELLIDO</th>
                <th style="width: 65px; text-align: center;">HANDICAP</th>
                <th>APODO</th>
                <th>CÉDULA</th>
                <th>CLUB</th>
                <th>CIUDAD / SEDE</th>
                <th style="text-align: center;">CELULAR</th>
                <th style="text-align: center;">ESTADO</th>
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
            <>
              <button
                type="button"
                onClick={() => setMostrarModalImportar(true)}
                className="btn-outline text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs font-semibold"
                title="Cargar jugadores de forma masiva desde una hoja de cálculo Excel o CSV"
              >
                <span className="material-icons text-sm text-emerald-700">file_upload</span>
                Importar Excel / CSV
              </button>

              <Link to="/jugadores/nuevo" className="btn-primary text-xs flex items-center gap-1">
                <span className="material-icons text-sm">person_add</span>
                Registrar Jugador
              </Link>
            </>
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

      {/* VISTA 1: TABLA COMPACTA (Orden Oficial del Torneo) */}
      {!isLoading && jugadores.length > 0 && vista === 'tabla' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="table-billar text-xs">
            <thead>
              <tr className="bg-gray-100/80">
                <th className="w-10 text-center font-bold">ID</th>
                <th className="font-bold">NOMBRE Y APELLIDO</th>
                <th className="text-center font-bold">HANDICAP</th>
                <th className="font-bold">APODO</th>
                <th className="font-bold">CÉDULA</th>
                <th className="font-bold">CLUB</th>
                <th className="font-bold">CIUDAD / SEDE</th>
                <th className="font-bold">CELULAR</th>
                <th className="text-center font-bold">ESTADO</th>
                {hasRole('admin') && <th className="text-center w-24 font-bold">ACCIONES</th>}
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j, idx) => {
                const promedio = j.promedio_historico ?? 0;
                let handicap = '3';
                let categoriaBadge = { label: 'Tercera (H3)', color: 'badge-amber', num: '3' };
                if (j.categoria?.includes('1') || promedio >= 0.8) {
                  categoriaBadge = { label: 'Primera (H1)', color: 'badge-green', num: '1' };
                  handicap = '1';
                } else if (j.categoria?.includes('2') || promedio >= 0.5) {
                  categoriaBadge = { label: 'Segunda (H2)', color: 'badge-blue', num: '2' };
                  handicap = '2';
                }

                return (
                  <tr key={j.id} className="hover:bg-gray-50 transition">
                    <td className="text-center font-bold text-gray-400 font-mono">{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {j.foto_url ? (
                          <img
                            src={j.foto_url}
                            alt={j.nombre_completo}
                            className="w-7 h-7 rounded-full object-cover border border-primary-400 flex-shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-[10px] border border-primary-200 flex-shrink-0">
                            {j.nombre_completo.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/publico/jugador/${j.id}`}
                            className="font-bold text-gray-900 hover:text-primary-600 block truncate"
                          >
                            {j.nombre_completo}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`${categoriaBadge.color} text-[11px] font-bold px-2.5 py-0.5 rounded-md`}>
                        {handicap}
                      </span>
                    </td>
                    <td className="text-gray-700 font-medium">
                      {j.alias ? <span className="italic font-semibold text-primary-900">"{j.alias}"</span> : '-'}
                    </td>
                    <td className="text-gray-600 font-mono text-[11px] font-semibold">{j.cedula || '-'}</td>
                    <td className="text-gray-800 font-medium">{j.club?.nombre ?? j.club_ciudad}</td>
                    <td className="text-gray-600 font-medium">{j.ciudad || (j.club?.ciudad ?? '-')}</td>
                    <td className="text-gray-600 font-mono text-[11px]">{j.celular || '-'}</td>
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
                {j.foto_url ? (
                  <img
                    src={j.foto_url}
                    alt={j.nombre_completo}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow-xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-lg border border-primary-200 flex-shrink-0">
                    {j.nombre_completo.charAt(0).toUpperCase()}
                  </div>
                )}
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

      {/* Modal para Importar Excel / CSV */}
      <ModalImportarExcel
        isOpen={mostrarModalImportar}
        onClose={() => setMostrarModalImportar(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['jugadores'] });
        }}
      />
    </div>
  );
}
