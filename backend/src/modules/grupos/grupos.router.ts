import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './grupos.controller';

const router = Router();

// Públicas
router.get('/:fase_id/clasificados', ctrl.obtenerClasificados);
router.get('/:fase_id', ctrl.listarGrupos);
router.get('/:fase_id/:id', ctrl.obtenerGrupo);

// Admin
router.post('/', authGuard, roleGuard('admin'), ctrl.crearGrupo);
router.delete('/:id', authGuard, roleGuard('admin'), ctrl.eliminarGrupo);
router.put('/:id/jugadores', authGuard, roleGuard('admin'), ctrl.asignarJugadores);
router.post('/:id/reemplazar', authGuard, roleGuard('admin'), ctrl.reemplazarJugador);
router.post('/:id/jugadores', authGuard, roleGuard('admin'), ctrl.agregarJugadorAGrupo);
router.delete('/:id/jugadores/:jugador_id', authGuard, roleGuard('admin'), ctrl.eliminarJugadorDeGrupo);
router.post('/:id/generar-partidas', authGuard, roleGuard('admin'), ctrl.generarPartidasGrupo);
router.post('/:fase_id/sorteo', authGuard, roleGuard('admin'), ctrl.sorteoAutomatico);
router.post('/:fase_id/generar-partidas', authGuard, roleGuard('admin'), ctrl.generarPartidasFase);

export default router;

