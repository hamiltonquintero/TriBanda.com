import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './ranking.controller';

const router = Router();

// ─── RUTAS ESPECÍFICAS PRIMERO ───────────────────────────────────────────────
router.get('/jugador/:jugador_id', authGuard, ctrl.obtenerEstadisticasJugador);

// ─── RUTAS CON PARÁMETRO GENÉRICO ───────────────────────────────────────────
router.get('/:torneo_id/clubes', ctrl.obtenerRankingClub);
router.get('/:torneo_id/recalcular', authGuard, roleGuard('admin'), ctrl.recalcularRankingCompleto);
router.post('/:torneo_id/puntos-finales', authGuard, roleGuard('admin'), ctrl.asignarPuntosPosicionFinal);
router.get('/:torneo_id', ctrl.obtenerRankingTorneo);

export default router;
