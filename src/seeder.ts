import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './users/user.entity';
import * as argon2 from 'argon2';
import { Propertie } from './propertie/entities/propertie.entity';
import { UserPropertyRole } from './propertie/entities/user-property-role.entity';
import { PropertyRole } from './common/enums/property-role.enum';
import { RoomType } from './inventory/room-types/room-type.entity';
import { Room } from './inventory/rooms/room.entity';
import { RoomStatus } from './common/enums/room-status.enum';
import { Rate } from './inventory/rates/rate.entity';

const DEFAULT_PASSWORD = 'password123';
const ROOMS_PER_TYPE = 5;
const RATE_DAYS = 60;
const PRICE_VARIANCE = 50;

const toDateString = (date: Date) => date.toISOString().split('T')[0];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('Seeding started...');
    const manager = queryRunner.manager;

    console.log('Clearing existing data...');
    const clear = async (entity: Function) => {
      await manager.createQueryBuilder().delete().from(entity).execute();
    };

    await clear(Rate);
    await clear(Room);
    await clear(RoomType);
    await clear(UserPropertyRole);
    await clear(Propertie);
    await clear(User);
    console.log('Existing data cleared');

    const passwordHash = await argon2.hash(DEFAULT_PASSWORD);
    const [savedAdmin] = await manager.save(
      manager.create(User, [
        {
          name: 'Admin User',
          email: 'admin@example.com',
          passwordHash,
          status: 'ACTIVE',
        },
        {
          name: 'Staff User',
          email: 'staff@example.com',
          passwordHash,
          status: 'ACTIVE',
        },
      ]),
    );
    console.log('Users created');

    const savedProperties = await manager.save(
      manager.create(Propertie, [
        {
          name: 'Grand Hotel',
          address: '123 Grand St, Big City',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          pinCode: 10001,
          description:
            'Experience luxury in the heart of the city. The Grand Hotel offers breathtaking views, world-class dining, and an unforgettable stay.',
          imageUrl:
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000',
          rating: 4.8,
          reviewCount: 1240,
          amenities: ['Pool', 'Spa', 'Gym', 'Free Wi-Fi', 'Restaurant'],
        },
        {
          name: 'Seaside Resort',
          address: '456 Beach Rd',
          city: 'Miami',
          state: 'FL',
          country: 'USA',
          pinCode: 33101,
          description:
            'Relax by the ocean at Seaside Resort. Private beaches, infinity pools, and sun-soaked days await you.',
          imageUrl:
            'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1000',
          rating: 4.6,
          reviewCount: 850,
          amenities: ['Private Beach', 'Infinity Pool', 'Bar', 'Water Sports'],
        },
        {
          name: 'Mountain Retreat',
          address: '789 Alpine Way',
          city: 'Aspen',
          state: 'CO',
          country: 'USA',
          pinCode: 81611,
          description:
            'Escape to the mountains. Cozy cabins, fireplaces, and skiing right at your doorstep.',
          imageUrl:
            'https://images.unsplash.com/photo-1519643381401-22c77e60520e?auto=format&fit=crop&q=80&w=1000',
          rating: 4.9,
          reviewCount: 560,
          amenities: [
            'Ski-in/Ski-out',
            'Fireplace',
            'Hot Tub',
            'Hiking Trails',
          ],
        },
        {
          name: 'Urban Boutique',
          address: '101 Downtown Ave',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          pinCode: 60601,
          description:
            'Modern, chic, and centrally located. Perfect for business travelers and city explorers.',
          imageUrl:
            'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1000',
          rating: 4.5,
          reviewCount: 920,
          amenities: ['Business Center', 'Rooftop Bar', 'High-speed Internet'],
        },
      ]),
    );
    console.log('Properties created');

    await manager.save(
      manager.create(UserPropertyRole, {
        user: savedAdmin,
        property: savedProperties[0],
        role: PropertyRole.PROPERTY_ADMIN,
        isActive: true,
      }),
    );
    console.log('Roles assigned');

    const roomTypeSeeds = [
      {
        data: {
          property: savedProperties[0],
          name: 'Standard Room',
          description: 'Comfortable room with city views.',
          capacity: 2,
          imageUrls: [
            'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000',
          ],
          amenities: ['TV', 'AC', 'Minibar'],
        },
        basePrice: 200,
      },
      {
        data: {
          property: savedProperties[0],
          name: 'Deluxe Suite',
          description: 'Luxury suite with separate living area.',
          capacity: 4,
          imageUrls: [
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000',
          ],
          amenities: ['Jacuzzi', 'King Bed', 'Ocean View'],
        },
        basePrice: 350,
      },
      {
        data: {
          property: savedProperties[1],
          name: 'Ocean View Room',
          description: 'Wake up to the sound of the waves.',
          capacity: 2,
          imageUrls: [
            'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1000',
          ],
          amenities: ['Balcony', 'Sea View'],
        },
        basePrice: 250,
      },
      {
        data: {
          property: savedProperties[2],
          name: 'Cozy Cabin',
          description: 'Rustic charm with modern amenities.',
          capacity: 4,
          imageUrls: [
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1000',
          ],
          amenities: ['Fireplace', 'Wood Interior'],
        },
        basePrice: 180,
      },
      {
        data: {
          property: savedProperties[3],
          name: 'City Loft',
          description: 'Stylish loft in the city center.',
          capacity: 2,
          imageUrls: [
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1000',
          ],
          amenities: ['Smart TV', 'Work Desk'],
        },
        basePrice: 150,
      },
    ];

    const savedRoomTypes = await manager.save(
      roomTypeSeeds.map((seed) => manager.create(RoomType, seed.data)),
    );
    console.log('Room Types created');

    const rooms = savedRoomTypes.flatMap((type) =>
      Array.from({ length: ROOMS_PER_TYPE }, (_, index) =>
        manager.create(Room, {
          roomNumber: `${type.name.substring(0, 1).toUpperCase()}-${100 + index + 1}`,
          roomType: type,
          property: type.property,
          status: RoomStatus.ACTIVE,
        }),
      ),
    );
    await manager.save(rooms);
    console.log('Rooms created');

    const startDate = new Date();
    const rates: Rate[] = [];

    savedRoomTypes.forEach((type, index) => {
      const basePrice = roomTypeSeeds[index].basePrice;
      for (let i = 0; i < RATE_DAYS; i += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toDateString(date);

        rates.push(
          manager.create(Rate, {
            property: type.property,
            roomType: type,
            startDate: dateStr,
            endDate: dateStr,
            price: basePrice + Math.floor(Math.random() * PRICE_VARIANCE),
          }),
        );
      }
    });

    await manager.save(rates);
    console.log('Rates created');

    await queryRunner.commitTransaction();
    console.log('Seeding completed successfully');
  } catch (err) {
    console.error('Seeding failed', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
