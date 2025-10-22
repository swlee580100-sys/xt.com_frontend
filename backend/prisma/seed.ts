import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      roles: ['admin', 'trader'],
      isActive: true
    },
    create: {
      email: adminEmail,
      displayName: 'Administrator',
      passwordHash,
      roles: ['admin', 'trader'],
      isActive: true
    }
  });
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error('Failed to seed database', error);
    await prisma.$disconnect();
    process.exit(1);
  });
