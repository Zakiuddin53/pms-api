import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User } from './users/user.entity';
import * as argon2 from 'argon2';
import { Property } from './property/entities/property.entity';
import { UserPropertyRole } from './property/entities/user-property-role.entity';
import { PropertyRole } from './common/enums/role.enum';
import { RoomType } from './inventory/room-types/entity/room-type.entity';
import { Room } from './inventory/rooms/room.entity';
import { RoomStatus } from './common/enums/room-status.enum';
import { Rate } from './inventory/rates/rate.entity';
import { Booking } from './bookings/entities/booking.entity';
import { BookingItem } from './bookings/entities/booking-item.entity';
import { PropertyContact } from './property/entities/property-contact.entity';
import { PropertyAbout } from './property/entities/property-about.entity';
import { PropertyType } from './common/enums/property-type.enum';
import { PropertyPolicy } from './property/entities/property-policy.entity';
import { PolicyType } from './common/enums/policy-type.enum';
import { Amenity } from './inventory/room-types/entity/amenity.entity';
import { RoomTypeAmenity } from './inventory/room-types/entity/room-type-amenity.entity';
import { UserStatus } from './common/enums/status.enum';

const DEFAULT_PASSWORD = 'password123';
const RATE_DAYS = 60;
const PRICE_PER_NIGHT = 3000;

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

    // Table deletion order matters
    await clear(BookingItem);
    await clear(Booking);
    await clear(Rate);
    await clear(Room);
    await clear(RoomTypeAmenity);
    await clear(RoomType);
    await clear(Amenity);
    await clear(UserPropertyRole);
    await clear(PropertyPolicy);
    await clear(PropertyContact);
    await clear(PropertyAbout);
    await clear(Property);
    await clear(User);
    console.log('Existing data cleared');

    const passwordHash = await argon2.hash(DEFAULT_PASSWORD);
    const users = await manager.save(
      manager.create(User, [
        {
          name: 'Arooba Admin',
          email: 'admin@arooba.com',
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      ]),
    );
    const savedAdmin = users[0];
    console.log('User created');

    const properties = await manager.save(
      manager.create(Property, [
        {
          name: 'Arooba Residency',
          address: 'House No. 6/65, Khobra Waddo, Calangute, Goa 403516',
          city: 'Calangute',
          state: 'Goa',
          pinCode: '403516',
          propertyType: PropertyType.HOTEL,
          imageUrls: [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
          ],
          rating: 4.0,
          isActive: true,
          ownerId: savedAdmin.id,
        },
      ]),
    );
    const savedProperty = properties[0];
    console.log('Property created: Arooba Residency');

    await manager.save(
      manager.create(PropertyContact, {
        Property: savedProperty,
        phone: '+91 8956056855',
        whatsapp: '+91 8956056855',
        email: 'aroobahotell@gmail.com',
        googleMapUrl: '',
      }),
    );
    console.log('Property contact information added');

    await manager.save(
      manager.create(PropertyAbout, {
        Property: savedProperty,
        description: `Welcome to Arooba Residency, nestled in the heart of New Arady. Our hotel offers a serene and inviting ambiance, perfect for both leisure and business travelers. Step into our spacious rooms, meticulously designed to provide utmost comfort and relaxation. Each room features modern amenities, ensuring a seamless stay. Our dedicated staff is committed to delivering exceptional service, catering to your every need. Indulge in the delectable flavors of our on-site restaurant, serving a wide range of culinary delights. Conveniently situated near major attractions and transportation hubs, Arooba Residency promises a convenient and accessible location for your travels. Experience the perfect blend of comfort and convenience at Arooba Residency.`,
        checkInTime: '12:00 PM',
        checkOutTime: '11:00 AM',
      }),
    );
    console.log('Property about information added');

    const policies = [
      {
        policyType: PolicyType.CANCELLATION,
        description: 'Free cancellation up to 24 hours before check-in. Cancellation within 24 hours will incur a 100% charge.',
      },
      {
        policyType: PolicyType.PAYMENT,
        description: 'Advance payment of 50% required at the time of booking. Balance can be paid at the hotel.',
      },
      {
        policyType: PolicyType.CHECK_IN,
        description: 'Primary guest must be at least 18 years of age. Passport, Aadhaar, Driving License and Govt. ID are accepted. Local IDs not allowed.',
      }
    ];

    for (const p of policies) {
      await manager.save(manager.create(PropertyPolicy, { ...p, Property: savedProperty }));
    }
    console.log('Property policies added');

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

    const amenityNames = [
      'Air Conditioner',
      'Smart TV',
      'Free Wireless Internet',
      'Private Balcony',
      'Car Parking',
      'Separate Bathroom',
      'Wardrobe',
      'Breakfast',
    ];
    const savedAmenities: Amenity[] = [];
    for (const name of amenityNames) {
      const amenity = await manager.save(manager.create(Amenity, { name }));
      savedAmenities.push(amenity);
    }
    console.log('Amenities created');

    const roomTypeSeeds = [
      {
        name: 'Deluxe Room',
        description: 'Comfortable deluxe room with a separate washroom and balcony, perfect for couples.',
        maxAdults: 2,
        maxChildren: 1,
        defaultPrice: 3000,
        roomCount: 2,
        imageUrls: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'],
        amenityIndices: [0, 1, 2, 3, 5, 6, 7]
      },
      {
        name: 'Super Jumbo Room',
        description: 'Spacious super jumbo room with a separate washroom and balcony, ideal for families.',
        maxAdults: 4,
        maxChildren: 2,
        defaultPrice: 5000,
        roomCount: 2,
        imageUrls: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'],
        amenityIndices: [0, 1, 2, 3, 4, 5, 6, 7]
      },
      {
        name: 'Family Room',
        description: 'Large family room with a separate washroom and balcony, designed for comfortable family stays.',
        maxAdults: 4,
        maxChildren: 2,
        defaultPrice: 4000,
        roomCount: 2,
        imageUrls: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'],
        amenityIndices: [0, 1, 2, 3, 5, 6, 7]
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
          maxAdults: seed.maxAdults,
          maxChildren: seed.maxChildren,
          defaultPrice: seed.defaultPrice,
          imageUrls: seed.imageUrls,
        }),
      );
      savedRoomTypes.push(roomType);

      // Add linking amenities
      for (const idx of seed.amenityIndices) {
        await manager.save(manager.create(RoomTypeAmenity, {
          RoomType: roomType,
          Amenity: savedAmenities[idx]
        }));
      }

      console.log(`Room Type created: ${seed.name}`);
    }

    const rooms: Room[] = [];
    for (let i = 0; i < savedRoomTypes.length; i++) {
      const roomType = savedRoomTypes[i];
      const seed = roomTypeSeeds[i];

      for (let roomIndex = 1; roomIndex <= seed.roomCount; roomIndex++) {
        const room = manager.create(Room, {
          propertyId: savedProperty.id,
          Property: savedProperty,
          roomTypeId: roomType.id,
          roomType: roomType,
          roomNumber: `${roomType.name.split(' ').map((w) => w[0]).join('')}${roomIndex}`,
          status: RoomStatus.ACTIVE,
        });
        rooms.push(room);
      }
    }
    await manager.save(rooms);
    console.log(`${rooms.length} individual rooms created`);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const rates: Rate[] = [];

    for (const roomType of savedRoomTypes) {
      for (let i = 0; i < RATE_DAYS; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        rates.push(
          manager.create(Rate, {
            propertyId: savedProperty.id,
            Property: savedProperty,
            roomTypeId: roomType.id,
            RoomType: roomType,
            startDate: date,
            endDate: date,
            price: roomType.defaultPrice,
          }),
        );
      }
    }

    await manager.save(rates);
    console.log(`${rates.length} rates created for ${RATE_DAYS} days`);

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
