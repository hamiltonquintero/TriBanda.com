import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { env } from '../../config/env';
import { Rol } from '@prisma/client';

export async function login(email: string, password: string) {
  const emailNorm = email.trim();
  const usuario = await prisma.usuario.findFirst({
    where: { email: { equals: emailNorm, mode: 'insensitive' } },
  });
  if (!usuario || !usuario.activo) throw new Error('Credenciales inválidas');

  const valido = await bcrypt.compare(password, usuario.password_hash);
  if (!valido) throw new Error('Credenciales inválidas');

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    env.JWT_SECRET as jwt.Secret,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return { token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } };
}

export async function crearUsuario(data: {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'juez' | 'jugador' | 'espectador';
  jugador_id?: string;
}) {
  const email = data.email.trim().toLowerCase();
  const existe = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (existe) throw new Error('El email ya está registrado');

  const password_hash = await bcrypt.hash(data.password, 12);

  return prisma.usuario.create({
    data: {
      nombre: data.nombre,
      email,
      password_hash,
      rol: data.rol,
      jugador_id: data.jugador_id,
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, created_at: true },
  });
}

export async function listarUsuarios(filtros?: { rol?: string }) {
  const validRoles = ['admin', 'juez', 'jugador', 'espectador'];
  return prisma.usuario.findMany({
    where: {
      ...(filtros?.rol && validRoles.includes(filtros.rol) && { rol: filtros.rol as Rol }),
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, created_at: true, jugador_id: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function actualizarUsuario(
  id: string,
  data: Partial<{ nombre: string; rol: Rol; activo: boolean; jugador_id: string | null }>
) {
  const { jugador_id } = data;
  // Solo se permiten estos campos (evita sobrescribir password_hash, id, etc.)
  const rest: Partial<{ nombre: string; rol: Rol; activo: boolean }> = {};
  if (typeof data.nombre === 'string' && data.nombre.trim()) rest.nombre = data.nombre.trim();
  if (data.rol && ['admin', 'juez', 'jugador', 'espectador'].includes(data.rol)) rest.rol = data.rol;
  if (typeof data.activo === 'boolean') rest.activo = data.activo;
  return prisma.usuario.update({
    where: { id },
    data: {
      ...rest,
      ...(jugador_id !== undefined
        ? jugador_id
          ? { jugador: { connect: { id: jugador_id } } }
          : { jugador: { disconnect: true } }
        : {}),
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });
}

export async function cambiarPassword(id: string, passwordActual: string, passwordNueva: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuario no encontrado');

  const valido = await bcrypt.compare(passwordActual, usuario.password_hash);
  if (!valido) throw new Error('Contraseña actual incorrecta');

  const password_hash = await bcrypt.hash(passwordNueva, 12);
  await prisma.usuario.update({ where: { id }, data: { password_hash } });
  return { mensaje: 'Contraseña actualizada correctamente' };
}
