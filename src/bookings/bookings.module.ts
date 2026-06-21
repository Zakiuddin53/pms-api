import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { BookingItem } from './entities/booking-item.entity';
import { BookingItemNight } from './entities/booking-item-night.entity';
import { BookingItemRoom } from './entities/booking-item-room.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { BookingGuest } from './entities/booking-guest.entity';
import { BookingLog } from './entities/booking-log.entity';
import { Room } from '../inventory/rooms/room.entity';
import { RoomType } from '../inventory/room-types/entity/room-type.entity';
import { RoomBlock } from '../inventory/room-blocks/room-block.entity';
import { Rate } from '../inventory/rates/rate.entity';
import { User } from '../users/user.entity';

import { BookingsService } from './service/bookings.service';
import { BookingAvailabilityService } from './service/booking-availability.service';
import { BookingCreationService } from './service/booking-creation.service';
import { BookingGuestService } from './service/booking-guest.service';
import { BookingLifecycleService } from './service/booking-lifecycle.service';
import { BookingPaymentService } from './service/booking-payment.service';
import { BookingQueryService } from './service/booking-query.service';
import { BookingCleanupService } from './service/booking-cleanup.service';
import { BookingAnalyticsService } from './service/booking-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingItem,
      BookingItemNight,
      BookingItemRoom,
      PaymentTransaction,
      BookingGuest,
      BookingLog,
      Room,
      RoomType,
      RoomBlock,
      Rate,
      User,
    ]),
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingAvailabilityService,
    BookingCreationService,
    BookingGuestService,
    BookingLifecycleService,
    BookingPaymentService,
    BookingQueryService,
    BookingCleanupService,
    BookingAnalyticsService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
