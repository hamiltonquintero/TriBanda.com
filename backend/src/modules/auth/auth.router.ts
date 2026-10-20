import { Router } from 'express';
import { authGuard, roleGuard } from '../../middlewares/authGuard';
import * as ctrl from './auth.controller';

const router = Router();

// Públicas
router.post('/login', ctrl.login);

// Autenticadas
router.get('/perfil', authGuard, ctrl.perfil);
router.put('/password', authGuard, ctrl.cambiarPassword);

// Solo admin
router.get('/usuarios', authGuard, roleGuard('admin', 'juez'), ctrl.listarUsuarios);
router.post('/usuarios', authGuard, roleGuard('admin'), ctrl.crearUsuario);
router.put('/usuarios/:id', authGuard, roleGuard('admin'), ctrl.actualizarUsuario);

export default router;
