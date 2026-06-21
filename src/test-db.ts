import { createConnection } from 'typeorm';
import { Property } from './property/entities/property.entity';
import { PropertyPolicy } from './property/entities/property-policy.entity';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

async function test() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [join(__dirname, '**/*.entity.ts')],
    synchronize: false,
  });

  const repo = connection.getRepository(Property);
  const property = await repo.findOne({
    where: { id: 2 },
    relations: ['Policies', 'Contact', 'PropertyAbout'],
  });

  console.log('Property ID 2:', JSON.stringify(property, null, 2));
  await connection.close();
}

test().catch(console.error);
