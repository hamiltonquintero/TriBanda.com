import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './partidas.controller';

const router = Router();

// ─── RUTAS ESPECÍFICAS PRIMERO (antes de /:torneo_id genérico) ───────────────

// Solicitudes de corrección (Admin)
router.get('/solicitudes-correccion', authGuard, roleGuard('admin'), ctrl.listarSolicitudesCorreccion);

// Autenticadas
router.get('/detalle/:id', authGuard, ctrl.obtenerPartida);
router.get('/planilla/:id', authGuard, ctrl.obtenerPlanilla);
router.get('/marcador/:id', ctrl.obtenerMarcador);
router.get('/jugador/:jugador_id', authGuard, ctrl.historialJugador);

// Admin
router.post('/', authGuard, roleGuard('admin'), ctrl.crearPartida);
router.patch('/:id/reabrir', authGuard, roleGuard('admin'), ctrl.reabrirPartida);
router.patch('/:id/rechazar-correccion', authGuard, roleGuard('admin'), ctrl.rechazarCorreccion);

// Juez o Admin
router.patch('/:id/iniciar', authGuard, roleGuard('juez', 'admin'), ctrl.iniciarPartida);
router.post('/:id/entrada', authGuard, roleGuard('juez', 'admin'), ctrl.registrarEntrada);
router.post('/:id/marcador', authGuard, roleGuard('juez', 'admin'), ctrl.marcadorAccion);
router.post('/:id/turno', authGuard, roleGuard('juez', 'admin'), ctrl.cambioTurno);
router.patch('/:id/set/:set_numero/finalizar', authGuard, roleGuard('juez', 'admin'), ctrl.finalizarSet);
router.patch('/:id/confirmar', authGuard, roleGuard('juez', 'admin'), ctrl.confirmarPartida);
router.post('/:id/solicitar-correccion', authGuard, roleGuard('juez', 'admin'), ctrl.solicitarCorreccion);

// ─── RUTA GENÉRICA AL FINAL ──────────────────────────────────────────────────
router.get('/torneo/:torneo_id', ctrl.listarPartidas);

export default router;
