import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/authGuard';
import * as authService from './auth.service';
import { loginSchema, crearUsuarioSchema, cambiarPasswordSchema } from './auth.schema';

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json(result);
  } catch (err) { next(err); }
}

export async function crearUsuario(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = crearUsuarioSchema.parse(req.body);
    const usuario = await authService.crearUsuario(data);
    res.status(201).json(usuario);
  } catch (err) { next(err); }
}

export async function listarUsuarios(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { rol } = req.query as { rol?: string };
    const usuarios = await authService.listarUsuarios({ rol });
    res.json(usuarios);
  } catch (err) { next(err); }
}

export async function actualizarUsuario(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const usuario = await authService.actualizarUsuario(id, req.body);
    res.json(usuario);
  } catch (err) { next(err); }
}

export async function cambiarPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = cambiarPasswordSchema.parse(req.body);
    const result = await authService.cambiarPassword(req.user!.id, data.password_actual, data.password_nueva);
    res.json(result);
  } catch (err) { next(err); }
}

export async function perfil(req: AuthRequest, res: Response) {
  res.json(req.user);
}
