import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './inscripciones.controller';

const router = Router();

// Público
router.get('/:torneo_id', ctrl.listarParticipantes);

// Admin y Juez
router.post('/:torneo_id/lote', authGuard, roleGuard('admin', 'juez'), ctrl.inscribirLote);
router.post('/:torneo_id', authGuard, roleGuard('admin', 'juez'), ctrl.inscribirJugador);
router.put('/meta/:id', authGuard, roleGuard('admin', 'juez'), ctrl.actualizarMeta);
router.delete('/:torneo_id/:jugador_id', authGuard, roleGuard('admin', 'juez'), ctrl.removerParticipante);
router.post('/:torneo_id/sorteo', authGuard, roleGuard('admin', 'juez'), ctrl.sorteoConGrupos);

export default router;
