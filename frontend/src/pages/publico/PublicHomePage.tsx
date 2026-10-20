import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Torneo } from '../../types';

export default function PublicHomePage() {
  const { data: torneos = [], isLoading } = useQuery<Torneo[]>({
    queryKey: ['public-torneos'],
    queryFn: () => api.get('/torneos').then((r) => r.data),
    refetchInterval: 30000,
  });

  const activos = torneos.filter((t) => t.estado === 'activo');
  const finalizados = torneos.filter((t) => t.estado === 'finalizado');

  return (
    <div className="min-h-screen bg-billar">
      {/* Header público */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-heading font-extrabold text-white">TRIBANDA</span>
            <span className="text-accent-400 text-sm font-light hidden sm:inline">Gestiona · Juega · Compite</span>
          </div>
          <Link to="/login" className="btn-outline text-xs">Ingresar</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading && <p className="text-white/60 text-center py-12">Cargando torneos...</p>}

        {/* Torneos activos — destacados */}
        {activos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-white font-heading font-bold text-xl mb-4">
              <span className="material-icons text-accent-400 align-middle mr-2">play_circle</span>
              Torneos en curso
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activos.map((t) => (
                <Link key={t.id} to={`/publico/torneos/${t.id}`}
                  className="card hover:shadow-xl transition group block border-l-4 border-accent-400">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-heading font-bold text-lg group-hover:text-primary-600 transition">{t.nombre}</h3>
                    <span className="badge-green text-[10px]">EN VIVO</span>
                  </div>
                  {t.descripcion && <p className="text-sm text-gray-500 mb-2">{t.descripcion}</p>}
                  <p className="text-sm text-gray-600">
                    <span className="material-icons text-xs align-middle mr-1">location_on</span>{t.sede}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="material-icons text-xs align-middle mr-1">calendar_today</span>
                    {new Date(t.fecha_inicio).toLocaleDateString('es-CO')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Torneos finalizados */}
        {finalizados.length > 0 && (
          <section>
            <h2 className="text-white/80 font-heading font-bold text-lg mb-4">
              <span className="material-icons text-white/50 align-middle mr-2">emoji_events</span>
              Torneos finalizados
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {finalizados.map((t) => (
                <Link key={t.id} to={`/publico/torneos/${t.id}`}
                  className="card-flat hover:shadow-lg transition group block opacity-90">
                  <h3 className="font-heading font-semibold group-hover:text-primary-600 transition">{t.nombre}</h3>
                  <p className="text-xs text-gray-500">{t.sede} — {new Date(t.fecha_inicio).toLocaleDateString('es-CO')}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isLoading && torneos.length === 0 && (
          <div className="text-center py-20">
            <span className="material-icons text-6xl text-white/20 block mb-4">sports_score</span>
            <p className="text-white/50 text-lg">No hay torneos disponibles</p>
          </div>
        )}
      </main>

      <footer className="bg-black/40 text-center py-3 border-t border-white/10">
        <span className="text-white/40 text-xs">TRIBANDA — Vista pública</span>
      </footer>
    </div>
  );
}
