import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { BookingItem } from './entities/booking-item.entity';
import { BookingItemNight } from './entities/booking-item-night.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { BookingsService } from './service/bookings.service';
import { BookingCleanupService } from './service/booking-cleanup.service';
import { Room } from '../inventory/rooms/room.entity';
import { RoomType } from '../inventory/room-types/entity/room-type.entity';
import { RoomBlock } from '../inventory/room-blocks/room-block.entity';
import { Rate } from '../inventory/rates/rate.entity';
import { User } from '../users/user.entity';
import { BookingItemRoom } from './entities/booking-item-room.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingItem,
      BookingItemNight,
      BookingItemRoom,
      PaymentTransaction,
      Room,
      RoomType,
      RoomBlock,
      Rate,
      User,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingCleanupService],
  exports: [BookingsService],
})
export class BookingsModule {}
