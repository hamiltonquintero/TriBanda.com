import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import TorneosPage from './pages/torneos/TorneosPage';
import NuevoTorneoPage from './pages/torneos/NuevoTorneoPage';
import DetalleTorneoPage from './pages/torneos/DetalleTorneoPage';
import TorneoGruposRedirectPage from './pages/torneos/TorneoGruposRedirectPage';
import EditarTorneoPage from './pages/torneos/EditarTorneoPage';
import NuevaFasePage from './pages/torneos/NuevaFasePage';
import JugadoresPage from './pages/jugadores/JugadoresPage';
import NuevoJugadorPage from './pages/jugadores/NuevoJugadorPage';
import JugadorDetallePage from './pages/jugadores/JugadorDetallePage';
import EditarJugadorPage from './pages/jugadores/EditarJugadorPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import RankingPage from './pages/ranking/RankingPage';
import BracketPage from './pages/bracket/BracketPage';
import PublicTorneoPage from './pages/publico/PublicTorneoPage';
import PublicHomePage from './pages/publico/PublicHomePage';

import GruposPage from './pages/grupos/GruposPage';
import DetalleGrupoPage from './pages/grupos/DetalleGrupoPage';
import AsignarJugadoresPage from './pages/grupos/AsignarJugadoresPage';

import PartidasPage from './pages/partidas/PartidasPage';
import NuevaPartidaPage from './pages/partidas/NuevaPartidaPage';
import PlanillaPage from './pages/partidas/PlanillaPage';
import MarcadorPage from './pages/partidas/MarcadorPage';

import JuezPanelPage from './pages/juez/JuezPanelPage';
import JuezLayout from './components/JuezLayout';

export default function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Con layout */}
      <Route path="/" element={<Layout><Navigate to="/torneos" replace /></Layout>} />
      <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />

      <Route path="/torneos" element={<Layout><TorneosPage /></Layout>} />
      <Route path="/torneos/:id" element={<Layout><DetalleTorneoPage /></Layout>} />
      <Route path="/torneos/:id/grupos" element={<Layout><TorneoGruposRedirectPage /></Layout>} />
      <Route path="/torneos/:id/ranking" element={<Layout><RankingPage /></Layout>} />
      <Route path="/torneos/:id/bracket" element={<Layout><BracketPage /></Layout>} />
      <Route path="/publico" element={<PublicHomePage />} />
      <Route path="/publico/torneos/:id" element={<PublicTorneoPage />} />
      <Route path="/torneo/:id" element={<PublicTorneoPage />} />
      <Route path="/publico/jugador/:id" element={
        <Layout><JugadorDetallePage /></Layout>
      } />
      <Route path="/torneos/nuevo" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <NuevoTorneoPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/torneos/:id/editar" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <EditarTorneoPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/torneos/:id/fases/nueva" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <NuevaFasePage />
          </ProtectedRoute>
        </Layout>
      } />

      {/* Grupos */}
      <Route path="/torneos/:torneoId/fases/:faseId/grupos" element={
        <Layout><GruposPage /></Layout>
      } />
      <Route path="/torneos/:torneoId/fases/:faseId/grupos/:id" element={
        <Layout><DetalleGrupoPage /></Layout>
      } />
      <Route path="/torneos/:torneoId/fases/:faseId/grupos/:id/asignar" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <AsignarJugadoresPage />
          </ProtectedRoute>
        </Layout>
      } />

      {/* Partidas */}
      <Route path="/torneos/:torneoId/partidas" element={
        <Layout><PartidasPage /></Layout>
      } />
      <Route path="/torneos/:torneoId/partidas/nueva" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <NuevaPartidaPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/partidas/:id/planilla" element={
        <Layout>
          <ProtectedRoute>
            <PlanillaPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/partidas/:id/marcador" element={
        <Layout><MarcadorPage /></Layout>
      } />

      {/* Jugadores */}
      <Route path="/jugadores" element={
        <Layout>
          <ProtectedRoute>
            <JugadoresPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/jugadores/nuevo" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <NuevoJugadorPage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/jugadores/:id" element={
        <Layout>
          <ProtectedRoute>
            <JugadorDetallePage />
          </ProtectedRoute>
        </Layout>
      } />
      <Route path="/jugadores/:id/editar" element={
        <Layout>
          <ProtectedRoute roles={['admin']}>
            <EditarJugadorPage />
          </ProtectedRoute>
        </Layout>
      } />

      {/* Panel del Juez */}
      <Route path="/juez" element={
        <JuezLayout>
          <ProtectedRoute roles={['juez', 'admin']}>
            <JuezPanelPage />
          </ProtectedRoute>
        </JuezLayout>
      } />
      <Route path="/juez/marcador/:id" element={
        <JuezLayout>
          <ProtectedRoute roles={['juez', 'admin']}>
            <MarcadorPage />
          </ProtectedRoute>
        </JuezLayout>
      } />
      <Route path="/juez/planilla/:id" element={
        <JuezLayout>
          <ProtectedRoute roles={['juez', 'admin']}>
            <PlanillaPage />
          </ProtectedRoute>
        </JuezLayout>
      } />

      {/* 404 */}
      <Route path="*" element={<Layout><p className="text-center py-16 text-gray-400">Página no encontrada</p></Layout>} />
    </Routes>
  );
}
