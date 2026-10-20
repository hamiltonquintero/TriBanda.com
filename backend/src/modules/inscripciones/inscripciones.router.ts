import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './inscripciones.controller';

const router = Router();

// Público
router.get('/:torneo_id', ctrl.listarParticipantes);

// Admin
router.post('/:torneo_id', authGuard, roleGuard('admin'), ctrl.inscribirJugador);
router.put('/meta/:id', authGuard, roleGuard('admin'), ctrl.actualizarMeta);
router.delete('/:torneo_id/:jugador_id', authGuard, roleGuard('admin'), ctrl.removerParticipante);
router.post('/:torneo_id/sorteo', authGuard, roleGuard('admin'), ctrl.sorteoConGrupos);

export default router;
