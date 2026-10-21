import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './torneos.controller';

const router = Router();

// Públicas
router.get('/', ctrl.listarTorneos);
router.get('/:id', ctrl.obtenerTorneo);
router.get('/:id/fases', ctrl.listarFases);
router.get('/:id/ranking', ctrl.obtenerRankingPublico);
router.get('/:id/bracket', ctrl.obtenerBracketPublico);
router.get('/:id/grupos', ctrl.obtenerGruposPublicos);

// Admin y Juez
router.post('/', authGuard, roleGuard('admin', 'juez'), ctrl.crearTorneo);
router.put('/:id', authGuard, roleGuard('admin', 'juez'), ctrl.editarTorneo);
router.patch('/:id/estado', authGuard, roleGuard('admin', 'juez'), ctrl.cambiarEstado);
router.post('/:id/fases', authGuard, roleGuard('admin', 'juez'), ctrl.crearFase);
router.put('/:id/fases/:faseId', authGuard, roleGuard('admin', 'juez'), ctrl.editarFase);
router.delete('/:id/fases/:faseId', authGuard, roleGuard('admin', 'juez'), ctrl.eliminarFase);

export default router;
