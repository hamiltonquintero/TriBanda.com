import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { usuario, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-billar">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-sm text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl font-heading font-extrabold tracking-tight text-white drop-shadow">TRIBANDA</span>
            <span className="text-xs text-accent-300 hidden sm:inline font-light">Gestiona · Juega · Compite</span>
            <span className="hidden lg:inline-block bg-white/10 text-white/80 text-[11px] px-2.5 py-0.5 rounded-full border border-white/15 ml-1">
              Desarrollado por <strong className="text-emerald-400">Hamilton Quintero</strong>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/torneos" className="hover:text-accent-400 transition font-medium text-white/90">Torneos</Link>
            <Link to="/dashboard" className="hover:text-accent-400 transition font-medium text-white/90">Dashboard</Link>
            <Link to="/publico" className="hover:text-accent-400 transition font-medium text-white/90">Público</Link>
            {isAuthenticated() && (
              <>
                <Link to="/jugadores" className="hover:text-accent-400 transition font-medium text-white/90">Jugadores</Link>
                {(usuario?.rol === 'juez' || usuario?.rol === 'admin') && (
                  <Link to="/juez" className="hover:text-accent-400 transition font-medium text-white/90">Panel Juez</Link>
                )}
                <span className="text-white/30">|</span>
                <span className="text-white/60 text-xs">{usuario?.nombre} ({usuario?.rol})</span>
                <button onClick={handleLogout} className="hover:text-accent-400 text-white/60 transition text-xs">
                  Salir
                </button>
              </>
            )}
            {!isAuthenticated() && (
              <Link to="/login" className="badge-amber text-xs">Ingresar</Link>
            )}
          </nav>
        </div>
      </header>

      {/* Contenido con fondo semi-transparente */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black/60 backdrop-blur-sm py-4 border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-white text-sm tracking-wider">TRIBANDA</span>
            <span className="text-white/40">•</span>
            <span className="text-accent-300 font-medium text-xs">Software Oficial de Billar a Tres Bandas</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/90 bg-white/5 border border-white/10 px-3 py-1 rounded-full shadow-inner">
            <span className="text-accent-400">⚡</span>
            <span>Creado y Desarrollado por</span>
            <strong className="text-emerald-400 font-bold tracking-wide">Hamilton Quintero</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}

