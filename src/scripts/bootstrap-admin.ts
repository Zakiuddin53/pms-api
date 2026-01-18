import 'reflect-metadata';
import argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Propertie } from '../propertie/entities/propertie.entity';
import { UserPropertyRole } from '../user-property-roles/user-property-role.entity';
import { PropertyRole } from '../common/enums/property-role.enum';
import * as dotenv from 'dotenv';

dotenv.config();


const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  entities: [User, Propertie, UserPropertyRole],
  synchronize: false,
});

const bootstrap = async () => {
  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(User);
  const membershipsRepo = dataSource.getRepository(UserPropertyRole);

  const email = (process.env.SUPER_ADMIN_EMAIL ?? '').toLowerCase().trim();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? '';
  const name = process.env.SUPER_ADMIN_FULL_NAME ?? 'Super Admin';
  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required');
  }

  const existing = await usersRepo.findOne({ where: { email } });
  if (existing) {
    console.log('Super admin already exists');
    return;
  }

  const passwordHash = await argon2.hash(password);
  const admin = usersRepo.create({
    name,
    email,
    passwordHash,
    status: 'ACTIVE',
  });
  const saved = await usersRepo.save(admin);
  const membership = membershipsRepo.create({
    userId: saved.id,
    propertyId: null,
    role: PropertyRole.SUPER_ADMIN,
    isActive: true,
  });
  await membershipsRepo.save(membership);
  console.log(`Super admin created with email ${email}`);
};

bootstrap()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dataSource.destroy();
  });
