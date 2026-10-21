import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './grupos.controller';

const router = Router();

// Públicas
router.get('/:fase_id/clasificados', ctrl.obtenerClasificados);
router.get('/:fase_id', ctrl.listarGrupos);
router.get('/:fase_id/:id', ctrl.obtenerGrupo);

// Operaciones de Fase (Rutas específicas primero)
router.post('/fase/:fase_id/generar-partidas', authGuard, roleGuard('admin', 'juez'), ctrl.generarPartidasFase);
router.post('/fase/:fase_id/sorteo', authGuard, roleGuard('admin', 'juez'), ctrl.sorteoAutomatico);
router.post('/fase/:fase_id/auto-asignar-jueces', authGuard, roleGuard('admin', 'juez'), ctrl.autoAsignarJuecesFase);

// Admin y Juez operaciones de Grupo
router.post('/', authGuard, roleGuard('admin', 'juez'), ctrl.crearGrupo);
router.delete('/:id', authGuard, roleGuard('admin', 'juez'), ctrl.eliminarGrupo);
router.put('/:id/jugadores', authGuard, roleGuard('admin', 'juez'), ctrl.asignarJugadores);
router.post('/:id/reemplazar', authGuard, roleGuard('admin', 'juez'), ctrl.reemplazarJugador);
router.post('/:id/jugadores', authGuard, roleGuard('admin', 'juez'), ctrl.agregarJugadorAGrupo);
router.delete('/:id/jugadores/:jugador_id', authGuard, roleGuard('admin', 'juez'), ctrl.eliminarJugadorDeGrupo);

// Rutas con ID dinámico (generarPartidasAuto resuelve inteligente si es grupo o fase)
router.post('/:fase_id/sorteo', authGuard, roleGuard('admin', 'juez'), ctrl.sorteoAutomatico);
router.post('/:id/generar-partidas', authGuard, roleGuard('admin', 'juez'), ctrl.generarPartidasAuto);

export default router;

