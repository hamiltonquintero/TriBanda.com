import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './jugadores.controller';

const router = Router();

// Clubes
router.get('/clubes', ctrl.listarClubes);
router.post('/clubes', authGuard, roleGuard('admin'), ctrl.crearClub);

// Jugadores
router.get('/', authGuard, ctrl.listarJugadores);
router.get('/perfil/:id', ctrl.obtenerJugador);  // público para ver perfil
router.post('/masivo', authGuard, roleGuard('admin'), ctrl.importarJugadoresMasivo);
router.get('/:id', authGuard, ctrl.obtenerJugador);
router.post('/', authGuard, roleGuard('admin'), ctrl.crearJugador);
router.put('/:id', authGuard, roleGuard('admin'), ctrl.editarJugador);
router.patch('/:id/desactivar', authGuard, roleGuard('admin'), ctrl.desactivarJugador);

export default router;
