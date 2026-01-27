import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrontdeskController } from './frontdesk.controller';
import { Booking } from './entity/booking.entity';
import { BookingItem } from './entity/booking-item.entity';
import { Customer } from './entity/customer.entity';
import { BookingsService } from './service/bookings.service';
import { BookingCleanupService } from './service/booking-cleanup.service';
import { Room } from '../inventory/rooms/room.entity';
import { RoomType } from '../inventory/room-types/room-type.entity';
import { RoomBlock } from '../inventory/room-blocks/room-block.entity';
import { Rate } from '../inventory/rates/rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingItem,
      Customer,
      Room,
      RoomType,
      RoomBlock,
      Rate,
    ]),
  ],
  controllers: [FrontdeskController],
  providers: [BookingsService, BookingCleanupService],
})
export class FrontdeskModule {}
