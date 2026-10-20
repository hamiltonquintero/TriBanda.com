import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function JuezLayout({ children }: { children: React.ReactNode }) {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-billar">
      {/* Header simplificado para juez */}
      <header className="bg-black/50 backdrop-blur-sm text-white border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/juez" className="flex items-center gap-2">
            <span className="material-icons text-accent-400">gavel</span>
            <span className="font-heading font-bold text-lg">TRIBANDA</span>
            <span className="text-xs text-white/50 hidden sm:inline">Panel Juez</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/juez" className="hover:text-accent-400 transition text-white/80">Mis partidas</Link>
            <span className="text-white/30">|</span>
            <span className="text-white/50 text-xs">{usuario?.nombre}</span>
            <button onClick={handleLogout} className="hover:text-accent-400 text-white/50 transition text-xs">Salir</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      <footer className="bg-black/40 text-center py-2 border-t border-white/10">
        <span className="text-white/40 text-xs">TRIBANDA — Panel del Juez</span>
      </footer>
    </div>
  );
}
