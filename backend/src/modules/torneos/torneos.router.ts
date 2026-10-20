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

// Solo admin
router.post('/', authGuard, roleGuard('admin'), ctrl.crearTorneo);
router.put('/:id', authGuard, roleGuard('admin'), ctrl.editarTorneo);
router.patch('/:id/estado', authGuard, roleGuard('admin'), ctrl.cambiarEstado);
router.post('/:id/fases', authGuard, roleGuard('admin'), ctrl.crearFase);
router.delete('/:id/fases/:faseId', authGuard, roleGuard('admin'), ctrl.eliminarFase);

export default router;
