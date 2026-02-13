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
import { Booking } from './frontdesk/entity/booking.entity';
import { BookingItem } from './frontdesk/entity/booking-item.entity';

const DEFAULT_PASSWORD = 'password123';
const RATE_DAYS = 60;
const PRICE_PER_NIGHT = 3000;

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

    await clear(BookingItem);
    await clear(Booking);
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
          name: 'Arooba Admin',
          email: 'admin@arooba.com',
          passwordHash,
          status: 'ACTIVE',
        },
      ]),
    );
    console.log('User created');

    const [savedProperty] = await manager.save(
      manager.create(Propertie, [
        {
          name: 'Arooba Residency',
          address: 'House No. 6/65, Khobra Waddo, Calangute, Goa 403516',
          city: 'Calangute',
          state: 'Goa',
          pinCode: 403516,
          imageUrls: [],
          rating: 0,
        },
      ]),
    );
    console.log('Property created: Arooba Residency');

    await manager.save(
      manager.create(UserPropertyRole, {
        userId: savedAdmin.id,
        propertyId: savedProperty.id,
        User: savedAdmin,
        Property: savedProperty,
        role: PropertyRole.PROPERTY_ADMIN,
        isActive: true,
      }),
    );
    console.log('Admin role assigned to property');

    const commonAmenities = [
      'Air Conditioner',
      'Smart TV',
      'Free Wireless Internet',
      'Private Balcony',
      'Car Parking',
      'Separate Bathroom',
      'Wardrobe',
      'Breakfast',
    ];

    const roomTypeSeeds = [
      {
        name: 'Deluxe Room',
        description:
          'Comfortable deluxe room with a separate washroom and balcony, perfect for couples.',
        capacity: 2,
        roomCount: 2,
        amenities: commonAmenities,
      },
      {
        name: 'Super Jumbo Room',
        description:
          'Spacious super jumbo room with a separate washroom and balcony, ideal for families.',
        capacity: 4,
        roomCount: 2,
        amenities: commonAmenities,
      },
      {
        name: 'Family Room',
        description:
          'Large family room with a separate washroom and balcony, designed for comfortable family stays.',
        capacity: 4,
        roomCount: 2,
        amenities: commonAmenities,
      },
    ];

    const savedRoomTypes: RoomType[] = [];
    for (const seed of roomTypeSeeds) {
      const roomType = await manager.save(
        manager.create(RoomType, {
          propertyId: savedProperty.id,
          Property: savedProperty,
          name: seed.name,
          description: seed.description,
          capacity: seed.capacity,
          amenities: seed.amenities,
          imageUrls: [],
        }),
      );
      savedRoomTypes.push(roomType);
      console.log(`Room Type created: ${seed.name}`);
    }

    const rooms: Room[] = [];
    for (let i = 0; i < savedRoomTypes.length; i++) {
      const roomType = savedRoomTypes[i];
      const seed = roomTypeSeeds[i];

      for (let roomIndex = 1; roomIndex <= seed.roomCount; roomIndex++) {
        const room = manager.create(Room, {
          propertyId: savedProperty.id,
          property: savedProperty,
          roomTypeId: roomType.id,
          roomType: roomType,
          roomNumber: `${roomType.name
            .split(' ')
            .map((w) => w[0])
            .join('')}${roomIndex}`,
          status: RoomStatus.ACTIVE,
        });
        rooms.push(room);
      }
    }
    await manager.save(rooms);
    console.log(`${rooms.length} individual rooms created`);

    const startDate = new Date();
    const rates: Rate[] = [];

    for (const roomType of savedRoomTypes) {
      for (let i = 0; i < RATE_DAYS; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toDateString(date);

        rates.push(
          manager.create(Rate, {
            propertyId: savedProperty.id,
            property: savedProperty,
            roomTypeId: roomType.id,
            RoomType: roomType,
            startDate: dateStr,
            endDate: dateStr,
            price: PRICE_PER_NIGHT,
          }),
        );
      }
    }

    await manager.save(rates);
    console.log(`${rates.length} rates created for ${RATE_DAYS} days`);

    await queryRunner.commitTransaction();
    console.log('Seeding completed successfully');
    console.log('\nSummary:');
    console.log(`- Property: ${savedProperty.name}`);
    console.log(`- Room Types: ${savedRoomTypes.length}`);
    console.log(`- Total Rooms: ${rooms.length}`);
    console.log(`- Rate per night: ₹${PRICE_PER_NIGHT}`);
  } catch (err) {
    console.error('Seeding failed', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
