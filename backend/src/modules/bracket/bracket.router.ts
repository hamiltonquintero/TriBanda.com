import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './bracket.controller';

const router = Router();

// ─── RUTAS ESPECÍFICAS PRIMERO ───────────────────────────────────────────────
router.post('/partidas/:partida_id/avanzar', authGuard, roleGuard('admin', 'juez'), ctrl.avanzarGanador);

// ─── RUTAS CON PARÁMETRO GENÉRICO ───────────────────────────────────────────
router.get('/:fase_id/clasificados', ctrl.obtenerClasificados);
router.post('/:fase_id/generar', authGuard, roleGuard('admin', 'juez'), ctrl.generarBracket);
router.get('/:fase_id', ctrl.obtenerBracket);

export default router;
