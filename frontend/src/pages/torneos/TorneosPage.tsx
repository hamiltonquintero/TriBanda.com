import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Torneo } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function TorneosPage() {
  const { hasRole } = useAuthStore();
  const { data: torneos = [], isLoading } = useQuery<Torneo[]>({
    queryKey: ['torneos'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">
          <span className="material-icons text-primary-600 align-middle mr-2">emoji_events</span>
          Torneos
        </h1>
        {hasRole('admin') && (
          <Link to="/torneos/nuevo" className="btn-primary">
            <span className="material-icons text-sm mr-1 align-middle">add</span>
            Nuevo torneo
          </Link>
        )}
      </div>

      {/* Banner Orientativo para Administradores */}
      <div className="mb-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🧭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Asistente Virtual TRIBANDA
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-heading font-black tracking-tight text-white mt-0.5">
              Guía Interactiva Paso a Paso Integrada
            </h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Haz clic en cualquier torneo abajo para abrir el asistente con los 4 pasos: <strong>1. Chulear Jugadores</strong> ➔ <strong>2. Sorteo Grupos</strong> ➔ <strong>3. Partidas y Marcadores</strong> ➔ <strong>4. Cuadro Playoffs 32</strong>.
            </p>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}

      {!isLoading && torneos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <span className="material-icons text-6xl text-primary-300 mb-4 block">sports_score</span>
          <p className="text-lg font-heading font-semibold text-gray-500">No hay torneos registrados</p>
          <p className="text-sm mt-1">Crea el primer torneo para empezar</p>
          {hasRole('admin') && (
            <Link to="/torneos/nuevo" className="mt-4 inline-block btn-secondary">
              <span className="material-icons text-sm mr-1 align-middle">add_circle</span>
              Crear torneo
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {torneos.map((t) => (
          <Link key={t.id} to={`/torneos/${t.id}`}
            className="card hover:shadow-lg transition group block">
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-heading font-bold text-lg leading-tight group-hover:text-primary-600 transition">
                {t.nombre}
              </h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold estado-${t.estado}`}>
                {t.estado}
              </span>
            </div>
            {t.descripcion && <p className="text-sm text-gray-500 mb-2">{t.descripcion}</p>}
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="material-icons text-xs align-middle mr-1 text-primary-500">location_on</span>{t.sede}</p>
              <p>
                <span className="material-icons text-xs align-middle mr-1 text-primary-500">calendar_today</span>
                {new Date(t.fecha_inicio).toLocaleDateString('es-CO')} — {new Date(t.fecha_fin).toLocaleDateString('es-CO')}
              </p>
              <p>
                <span className="material-icons text-xs align-middle mr-1 text-accent-500">layers</span>
                {t.fases?.length ?? 0} fase(s)
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
