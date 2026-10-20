import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin1234', 12);
  const juezHash = await bcrypt.hash('juez1234', 12);

  // 1. Admin principal
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@billar.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@billar.com',
      password_hash: adminHash,
      rol: 'admin',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // 2. Jueces de mesa
  const jueces = [
    { nombre: 'Juez Mesa 1', email: 'juez1@billar.com' },
    { nombre: 'Juez Mesa 2', email: 'juez2@billar.com' },
    { nombre: 'Juez Mesa 3', email: 'juez3@billar.com' },
  ];

  for (const j of jueces) {
    const juez = await prisma.usuario.upsert({
      where: { email: j.email },
      update: {},
      create: {
        nombre: j.nombre,
        email: j.email,
        password_hash: juezHash,
        rol: 'juez',
      },
    });
    console.log(`✅ Juez creado: ${juez.email} (${juez.nombre})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
