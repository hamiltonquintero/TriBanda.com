import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['admin', 'juez', 'jugador', 'espectador']),
  jugador_id: z.string().uuid().optional(),
});

export const cambiarPasswordSchema = z.object({
  password_actual: z.string().min(1),
  password_nueva: z.string().min(8, 'Mínimo 8 caracteres'),
});
