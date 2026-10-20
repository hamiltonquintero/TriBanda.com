import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';
import { Torneo, Partida } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function DashboardPage() {
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);

  const { data: torneos = [], isLoading } = useQuery<Torneo[]>({
    queryKey: ['dashboard-torneos'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
  });

  // Solicitudes de corrección de jueces (Solo Admin)
  const { data: solicitudes = [] } = useQuery<Partida[]>({
    queryKey: ['solicitudes-correccion'],
    queryFn: () => api.get('/partidas/solicitudes-correccion').then((r) => r.data),
    enabled: hasRole('admin'),
    refetchInterval: 10000,
  });

  const aprobarReapertura = useMutation({
    mutationFn: (partidaId: string) =>
      api.patch(`/partidas/${partidaId}/reabrir`, { motivo: 'Aprobado por Superadministrador' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-correccion'] });
      alert('Partida reabierta correctamente. El juez o admin ya puede editarla.');
    },
  });

  const rechazarCorreccion = useMutation({
    mutationFn: (partidaId: string) =>
      api.patch(`/partidas/${partidaId}/rechazar-correccion`, { motivo: 'Rechazado por el Administrador' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-correccion'] });
      alert('Solicitud de corrección rechazada.');
    },
  });

  const reset = useMutation({
    mutationFn: () => api.delete('/admin/reset', { data: { confirmar: 'ELIMINAR_TODO' } }),
    onSuccess: () => {
      qc.invalidateQueries();
      setConfirmReset(false);
      alert('Base de datos vaciada correctamente. Los usuarios se mantienen.');
    },
  });

  const activos = torneos.filter((t) => t.estado === 'activo').length;
  const borrador = torneos.filter((t) => t.estado === 'borrador').length;
  const finalizados = torneos.filter((t) => t.estado === 'finalizado').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold text-gray-900">
        <span className="material-icons text-primary-600 align-middle mr-2">dashboard</span>
        Panel de Control Principal
      </h1>

      {/* Alerta de solicitudes de corrección para el Superadmin */}
      {hasRole('admin') && solicitudes.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-amber-950 flex items-center gap-2">
              <span className="material-icons text-amber-600 animate-bounce">notification_important</span>
              Solicitudes de Corrección de Jueces ({solicitudes.length})
            </h2>
            <span className="badge-amber text-xs font-semibold px-2 py-0.5 rounded-full">
              Requiere Autorización
            </span>
          </div>
          <p className="text-xs text-amber-800">
            Los siguientes jueces solicitaron reabrir partidas confirmadas para corregir entradas o carambolas.
          </p>

          <div className="space-y-3 pt-1">
            {solicitudes.map((partida) => (
              <div
                key={partida.id}
                className="bg-white rounded-lg p-3 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-gray-400">
                    Torneo: <strong>{partida.fase?.torneo?.nombre ?? 'Torneo'}</strong> — Juez: {partida.juez?.nombre ?? 'Sin asignar'}
                  </p>
                  <p className="font-semibold text-sm text-gray-900 mt-0.5">
                    {partida.jugador_a?.nombre_completo} vs {partida.jugador_b?.nombre_completo}
                  </p>
                  {partida.motivo_reapertura && (
                    <p className="text-xs bg-amber-50 text-amber-900 border border-amber-100 rounded p-1.5 mt-1">
                      <strong>Motivo:</strong> "{partida.motivo_reapertura}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/partidas/${partida.id}/planilla`}
                    className="btn-outline text-xs px-2.5 py-1.5 border-gray-300 text-gray-700"
                  >
                    Ver Planilla
                  </Link>
                  <button
                    onClick={() => rechazarCorreccion.mutate(partida.id)}
                    disabled={rechazarCorreccion.isPending}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => aprobarReapertura.mutate(partida.id)}
                    disabled={aprobarReapertura.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold shadow-sm"
                  >
                    ✓ Aprobar y Reabrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? <p className="text-gray-500">Cargando resumen...</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-flat"><p className="text-sm text-gray-500">Torneos Activos</p><p className="text-3xl font-extrabold text-primary-600">{activos}</p></div>
            <div className="card-flat"><p className="text-sm text-gray-500">En Borrador</p><p className="text-3xl font-extrabold text-accent-600">{borrador}</p></div>
            <div className="card-flat"><p className="text-sm text-gray-500">Finalizados</p><p className="text-3xl font-extrabold text-gray-600">{finalizados}</p></div>
          </div>

          <div className="card-flat">
            <h2 className="font-heading font-semibold mb-3">Torneos recientes</h2>
            <ul className="space-y-2 text-sm">
              {torneos.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="font-medium">{t.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full estado-${t.estado}`}>{t.estado}</span>
                    <Link to={`/torneos/${t.id}`} className="text-primary-600 hover:underline text-xs">Ver detalle</Link>
                  </div>
                </li>
              ))}
              {!torneos.length && <li className="text-gray-400">No hay torneos creados.</li>}
            </ul>
          </div>

          {/* Zona de peligro — solo admin */}
          {hasRole('admin') && (
            <div className="card-flat border-2 border-red-200">
              <h2 className="font-heading font-semibold text-red-600 mb-2">
                <span className="material-icons align-middle mr-1 text-sm">warning</span>
                Zona de peligro
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                Vaciar toda la base de datos: elimina torneos, jugadores, partidas, grupos, rankings y llaves. Los usuarios (superadmin, juez, público) se mantienen.
              </p>

              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  <span className="material-icons align-middle mr-1 text-sm">delete_forever</span>
                  Vaciar base de datos
                </button>
              ) : (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                  <p className="text-red-700 font-semibold mb-3">
                    ¿Estás seguro? Esta acción NO se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reset.mutate()}
                      disabled={reset.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition"
                    >
                      {reset.isPending ? 'Vaciando...' : 'Sí, vaciar todo'}
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="btn-outline text-gray-700 border-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
