import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@billar.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@billar.com',
      password_hash: hash,
      rol: 'admin',
    },
  });
  console.log('✅ Admin creado:', admin.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
