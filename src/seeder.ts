
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

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    console.log('Seeding started...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        console.log('Clearing existing data...');
        // Order matters due to foreign key constraints
        await queryRunner.manager.createQueryBuilder().delete().from(Rate).execute();
        await queryRunner.manager.createQueryBuilder().delete().from(Room).execute();
        await queryRunner.manager.createQueryBuilder().delete().from(RoomType).execute();
        await queryRunner.manager.createQueryBuilder().delete().from(UserPropertyRole).execute();
        await queryRunner.manager.createQueryBuilder().delete().from(Propertie).execute();
        await queryRunner.manager.createQueryBuilder().delete().from(User).execute();
        console.log('Existing data cleared');

        // 1. Create Users
        const passwordHash = await argon2.hash('password123');

        const adminUser = new User();
        adminUser.name = 'Admin User';
        adminUser.email = 'admin@example.com';
        adminUser.passwordHash = passwordHash;
        adminUser.status = 'ACTIVE';

        const staffUser = new User();
        staffUser.name = 'Staff User';
        staffUser.email = 'staff@example.com';
        staffUser.passwordHash = passwordHash;
        staffUser.status = 'ACTIVE';

        // Save users
        const savedAdmin = await queryRunner.manager.save(adminUser);
        const savedStaff = await queryRunner.manager.save(staffUser);
        console.log('Users created');

        // 2. Create Properties
        const propertiesData = [
            {
                name: 'Grand Hotel',
                address: '123 Grand St, Big City',
                city: 'New York',
                state: 'NY',
                country: 'USA',
                pinCode: 10001,
                description: 'Experience luxury in the heart of the city. The Grand Hotel offers breathtaking views, world-class dining, and an unforgettable stay.',
                imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000',
                rating: 4.8,
                reviewCount: 1240,
                amenities: ['Pool', 'Spa', 'Gym', 'Free Wi-Fi', 'Restaurant']
            },
            {
                name: 'Seaside Resort',
                address: '456 Beach Rd',
                city: 'Miami',
                state: 'FL',
                country: 'USA',
                pinCode: 33101,
                description: 'Relax by the ocean at Seaside Resort. Private beaches, infinity pools, and sun-soaked days await you.',
                imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=1000',
                rating: 4.6,
                reviewCount: 850,
                amenities: ['Private Beach', 'Infinity Pool', 'Bar', 'Water Sports']
            },
            {
                name: 'Mountain Retreat',
                address: '789 Alpine Way',
                city: 'Aspen',
                state: 'CO',
                country: 'USA',
                pinCode: 81611,
                description: 'Escape to the mountains. cozy cabins, fireplaces, and skiing right at your doorstep.',
                imageUrl: 'https://images.unsplash.com/photo-1519643381401-22c77e60520e?auto=format&fit=crop&q=80&w=1000',
                rating: 4.9,
                reviewCount: 560,
                amenities: ['Ski-in/Ski-out', 'Fireplace', 'Hot Tub', 'Hiking Trails']
            },
            {
                name: 'Urban Boutique',
                address: '101 Downtown Ave',
                city: 'Chicago',
                state: 'IL',
                country: 'USA',
                pinCode: 60601,
                description: 'Modern, chic, and centrally located. Perfect for business travelers and city explorers.',
                imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1000',
                rating: 4.5,
                reviewCount: 920,
                amenities: ['Business Center', 'Rooftop Bar', 'High-speed Internet']
            }
        ];

        const savedProperties: Propertie[] = [];
        for (const pData of propertiesData) {
            const p = new Propertie();
            Object.assign(p, pData);
            const saved = await queryRunner.manager.save(p);
            savedProperties.push(saved);
        }
        console.log('Properties created');

        // 3. Assign Roles (Assign admin to first property)
        const role1 = new UserPropertyRole();
        role1.user = savedAdmin;
        role1.property = savedProperties[0];
        role1.role = PropertyRole.PROPERTY_ADMIN;
        role1.isActive = true;

        await queryRunner.manager.save(role1);
        console.log('Roles assigned');

        // 4. Create Room Types
        const roomTypesData = [
            // Grand Hotel
            {
                property: savedProperties[0],
                name: 'Standard Room',
                description: 'Comfortable room with city views.',
                capacity: 2,
                basePrice: 200,
                imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000',
                amenities: ['TV', 'AC', 'Minibar']
            },
            {
                property: savedProperties[0],
                name: 'Deluxe Suite',
                description: 'Luxury suite with separate living area.',
                capacity: 4,
                basePrice: 350,
                imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000',
                amenities: ['Jacuzzi', 'King Bed', 'Ocean View']
            },
            // Seaside Resort
            {
                property: savedProperties[1],
                name: 'Ocean View Room',
                description: 'Wake up to the sound of the waves.',
                capacity: 2,
                basePrice: 250,
                imageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1000',
                amenities: ['Balcony', 'Sea View']
            },
            // Mountain Retreat
            {
                property: savedProperties[2],
                name: 'Cozy Cabin',
                description: 'Rustic charm with modern amenities.',
                capacity: 4,
                basePrice: 180,
                imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1000',
                amenities: ['Fireplace', 'Wood Intrior']
            },
            // Urban Boutique
            {
                property: savedProperties[3],
                name: 'City Loft',
                description: 'Stylish loft in the city center.',
                capacity: 2,
                basePrice: 150,
                imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1000',
                amenities: ['Smart TV', 'Work Desk']
            },
        ];

        const savedRoomTypes: RoomType[] = [];
        for (const rtData of roomTypesData) {
            const rt = new RoomType();
            rt.name = rtData.name;
            rt.description = rtData.description;
            rt.property = rtData.property;
            rt.capacity = rtData.capacity;
            rt.basePrice = rtData.basePrice;
            rt.imageUrl = rtData.imageUrl;
            rt.amenities = rtData.amenities;

            const saved = await queryRunner.manager.save(rt);
            savedRoomTypes.push(saved);
        }
        console.log('Room Types created');

        // 5. Create Rooms (5 per type)
        const rooms: Room[] = [];
        for (const type of savedRoomTypes) {
            for (let i = 1; i <= 5; i++) {
                const room = new Room();
                room.roomNumber = `${type.name.substring(0, 1).toUpperCase()}-${100 + i}`;
                room.roomType = type;
                room.property = type.property;
                room.status = RoomStatus.ACTIVE;
                rooms.push(room);
            }
        }
        await queryRunner.manager.save(rooms);
        console.log('Rooms created');

        // 6. Create Rates
        const startDate = new Date();
        const rates: Rate[] = [];

        for (const type of savedRoomTypes) {
            for (let i = 0; i < 60; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];

                const rate = new Rate();
                rate.propertyId = type.property.id;
                rate.roomTypeId = type.id;
                rate.startDate = dateStr;
                rate.endDate = dateStr;
                // Use basePrice from room type + random variance
                rate.price = Number(type.basePrice) + Math.floor(Math.random() * 50);

                rates.push(rate);
            }
        }

        await queryRunner.manager.save(rates);
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
