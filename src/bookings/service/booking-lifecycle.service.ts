import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingItemRoom } from '../entities/booking-item-room.entity';
import { BookingLog, BookingLogAction } from '../entities/booking-log.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { User } from '../../users/user.entity';
import { BookingStatus } from '@/common/enums/booking.enum';
import { CheckInDto } from '../dto/create-check-in.dto';
import { CheckOutDto } from '../dto/check-out.dto';

@Injectable()
export class BookingLifecycleService {
  private readonly logger = new Logger(BookingLifecycleService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  async confirmBooking(
    propertyId: number,
    bookingId: number,
    paidAmount?: number,
  ) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === BookingStatus.CONFIRMED) {
      return { success: true, status: BookingStatus.CONFIRMED };
    }

    if (booking.status !== BookingStatus.HOLD) {
      throw new BadRequestException(
        `Cannot confirm a booking with status ${booking.status}`,
      );
    }

    const confirmed = await this.markConfirmed(
      bookingId,
      typeof paidAmount === 'number'
        ? paidAmount
        : Number(booking.paidAmount ?? booking.totalAmount ?? 0),
    );

    return {
      success: true,
      status: confirmed.status,
      bookingCode: confirmed.bookingCode,
      paidAmount: confirmed.paidAmount,
    };
  }

  async markConfirmed(bookingId: number, paidAmount: number): Promise<Booking> {
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: { Items: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.CONFIRMED) return booking;

    if (booking.status !== BookingStatus.HOLD) {
      throw new BadRequestException(
        `Cannot confirm a booking with status ${booking.status}`,
      );
    }

    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      throw new BadRequestException('Hold has expired');
    }

    booking.status = BookingStatus.CONFIRMED;
    booking.holdExpiresAt = null;
    booking.paidAmount = paidAmount;
    await this.bookings.save(booking);

    this.logger.log(
      `Booking ${booking.bookingCode} confirmed (paidAmount=${paidAmount})`,
    );
    return booking;
  }

  async cancelBooking(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const cancellableStatuses = [
      BookingStatus.HOLD,
      BookingStatus.CONFIRMED,
    ] as string[];

    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Booking with status ${booking.status} cannot be cancelled`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      booking.status = BookingStatus.CANCELLED;
      booking.holdExpiresAt = null;
      await manager.save(Booking, booking);

      await manager.save(
        BookingLog,
        manager.create(BookingLog, {
          bookingId: booking.id,
          action: BookingLogAction.CANCELLED,
          description: 'Booking cancelled by user/admin.',
        }),
      );
    });

    this.logger.log(`Booking ${booking.bookingCode} cancelled`);
    return { success: true, status: BookingStatus.CANCELLED };
  }

  async checkIn(propertyId: number, bookingId: number, dto: CheckInDto) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
      relations: { Guests: { Guest: true }, Items: { AssignedRooms: true } },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only CONFIRMED bookings can be checked in',
      );
    }

    const primaryGuest = booking.Guests?.find((bg) => bg.isPrimary)?.Guest;

    await this.dataSource.transaction(async (manager) => {
      // 1. Assign rooms if provided
      if (dto.roomAssignments?.length) {
        for (const assignment of dto.roomAssignments) {
          const item = booking.Items.find(
            (i) => i.id === assignment.bookingItemId,
          );
          if (!item) continue;

          const room = await manager.findOne(Room, {
            where: {
              id: assignment.roomId,
              propertyId,
              roomTypeId: item.roomTypeId,
            },
          });
          if (!room) {
            throw new BadRequestException(
              `Room ${assignment.roomId} not found or mismatch type`,
            );
          }

          await manager.delete(BookingItemRoom, { bookingItemId: item.id });
          await manager.save(
            BookingItemRoom,
            manager.create(BookingItemRoom, {
              bookingItemId: item.id,
              roomId: assignment.roomId,
            }),
          );
        }
      }

      // 2. Update primary guest ID details on the User record
      if (primaryGuest) {
        if (dto.idType) primaryGuest.idType = dto.idType;
        if (dto.idFrontUrl) primaryGuest.idFrontUrl = dto.idFrontUrl;
        if (dto.idBackUrl) primaryGuest.idBackUrl = dto.idBackUrl;
        await manager.save(User, primaryGuest);
      }

      // 3. Set status
      booking.status = BookingStatus.CHECKED_IN;
      await manager.save(Booking, booking);

      // 4. Log
      await manager.save(
        BookingLog,
        manager.create(BookingLog, {
          bookingId: booking.id,
          action: BookingLogAction.CHECKED_IN,
          description: 'Guest checked in and room assigned.',
        }),
      );
    });

    this.logger.log(`Booking ${booking.bookingCode} checked in`);
    return { success: true, status: BookingStatus.CHECKED_IN };
  }

  async checkOut(propertyId: number, bookingId: number, dto?: CheckOutDto) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
      relations: { Guests: { Guest: true } },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        'Only CHECKED_IN bookings can be checked out',
      );
    }

    const primaryGuest = booking.Guests?.find((bg) => bg.isPrimary)?.Guest;

    if (!dto?.force) {
      const balance = Number(booking.totalAmount) - Number(booking.paidAmount);
      if (balance > 0) {
        throw new BadRequestException(
          `Cannot check out. Pending balance of ${balance}`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      booking.status = BookingStatus.CHECKED_OUT;
      await manager.save(Booking, booking);

      await manager.save(
        BookingLog,
        manager.create(BookingLog, {
          bookingId: booking.id,
          action: BookingLogAction.CHECKED_OUT,
          description: dto?.force
            ? 'Guest checked out manually (Force flag used).'
            : 'Guest checked out successfully.',
        }),
      );
    });

    this.logger.log(
      `Booking ${booking.bookingCode} checked out${dto?.force ? ' (Forced)' : ''}`,
    );
    return { success: true, status: BookingStatus.CHECKED_OUT };
  }

  async earlyCheckout(propertyId: number, bookingId: number, dto: any) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
    });
    if (!booking || booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException('Cannot early checkout');
    }
    booking.checkOut =
      dto.checkoutDate || new Date().toISOString().slice(0, 10);
    booking.status = BookingStatus.CHECKED_OUT;
    await this.bookings.save(booking);
    return { success: true, status: BookingStatus.CHECKED_OUT };
  }

  async changeRoom(propertyId: number, bookingId: number, dto: any) {
    return { success: true, message: 'Room changed' };
  }

  /**
   * Bulk-cancel all HOLD bookings whose holdExpiresAt has passed.
   * Called by the cron job in BookingCleanupService every minute.
   */
  async cancelExpiredHolds() {
    const result = await this.bookings
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.CANCELLED, holdExpiresAt: null })
      .where('status = :status', { status: BookingStatus.HOLD })
      .andWhere('holdExpiresAt IS NOT NULL')
      .andWhere('holdExpiresAt <= NOW()')
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cancelled ${result.affected} expired hold(s)`);
    }
  }
}
