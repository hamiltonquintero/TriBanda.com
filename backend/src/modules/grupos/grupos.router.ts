import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './grupos.controller';

const router = Router();

// Públicas
router.get('/:fase_id/clasificados', ctrl.obtenerClasificados);
router.get('/:fase_id', ctrl.listarGrupos);
router.get('/:fase_id/:id', ctrl.obtenerGrupo);

// Operaciones de Fase (Rutas específicas primero)
router.post('/fase/:fase_id/generar-partidas', authGuard, roleGuard('admin'), ctrl.generarPartidasFase);
router.post('/fase/:fase_id/sorteo', authGuard, roleGuard('admin'), ctrl.sorteoAutomatico);
router.post('/fase/:fase_id/auto-asignar-jueces', authGuard, roleGuard('admin'), ctrl.autoAsignarJuecesFase);

// Admin operaciones de Grupo
router.post('/', authGuard, roleGuard('admin'), ctrl.crearGrupo);
router.delete('/:id', authGuard, roleGuard('admin'), ctrl.eliminarGrupo);
router.put('/:id/jugadores', authGuard, roleGuard('admin'), ctrl.asignarJugadores);
router.post('/:id/reemplazar', authGuard, roleGuard('admin'), ctrl.reemplazarJugador);
router.post('/:id/jugadores', authGuard, roleGuard('admin'), ctrl.agregarJugadorAGrupo);
router.delete('/:id/jugadores/:jugador_id', authGuard, roleGuard('admin'), ctrl.eliminarJugadorDeGrupo);

// Rutas con ID dinámico (generarPartidasAuto resuelve inteligente si es grupo o fase)
router.post('/:fase_id/sorteo', authGuard, roleGuard('admin'), ctrl.sorteoAutomatico);
router.post('/:id/generar-partidas', authGuard, roleGuard('admin'), ctrl.generarPartidasAuto);

export default router;

