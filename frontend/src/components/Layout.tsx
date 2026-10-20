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
      <footer className="bg-black/50 backdrop-blur-sm text-center py-4 border-t border-white/10">
        <span className="font-heading font-bold text-white text-sm">TRIBANDA</span>
        <span className="text-white/50 text-xs ml-2">Gestiona · Juega · Compite</span>
      </footer>
    </div>
  );
}
