import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingItemRoom } from '../entities/booking-item-room.entity';
import { Room } from '@/inventory/rooms/room.entity';
import { BookingStatus } from '@/common/enums/booking.enum';
import { RoomStatus } from '@/common/enums/room-status.enum';
import {
  AnalyticsDateType,
  BookingAnalyticsQueryDto,
} from '../dto/booking-analytics-query.dto';
import { BookingAnalyticsResponseDto } from '../dto/booking-analytics-response.dto';

/** Statuses excluded from revenue calculations */
const EXCLUDED_REVENUE_STATUSES = [
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
];

/** Statuses counted as active bookings */
const ACTIVE_STATUSES = [
  BookingStatus.HOLD,
  BookingStatus.RESERVED,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

@Injectable()
export class BookingAnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingItemRoom)
    private readonly bookingItemRooms: Repository<BookingItemRoom>,
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
  ) {}

  async getAnalytics(
    propertyId: number,
    query: BookingAnalyticsQueryDto,
  ): Promise<BookingAnalyticsResponseDto> {
    const dateType = query.dateType ?? AnalyticsDateType.CHECK_IN;

    // Map the dateType enum value to the actual column name on the Booking entity.
    // checkIn / checkOut are stored as `date` columns; createdAt is a timestamp.
    const dateColumn =
      dateType === AnalyticsDateType.CREATED_AT ? 'booking.createdAt' : `booking.${dateType}`;

    // ── Revenue & status aggregates ──────────────────────────────────────────
    const revenueQb = this.bookings
      .createQueryBuilder('booking')
      .select('booking.status', 'status')
      .addSelect('SUM(booking.totalAmount)', 'totalAmount')
      .addSelect('SUM(booking.paidAmount)', 'paidAmount')
      .addSelect('COUNT(booking.id)', 'count')
      .where('booking.propertyId = :propertyId', { propertyId })
      .groupBy('booking.status');

    if (query.fromDate) {
      revenueQb.andWhere(`${dateColumn} >= :fromDate`, { fromDate: query.fromDate });
    }
    if (query.toDate) {
      revenueQb.andWhere(`${dateColumn} <= :toDate`, { toDate: query.toDate });
    }

    const rows: Array<{
      status: BookingStatus;
      totalAmount: string;
      paidAmount: string;
      count: string;
    }> = await revenueQb.getRawMany();

    // ── Aggregate from raw rows ──────────────────────────────────────────────
    let totalRevenue = 0;
    let collectedRevenue = 0;
    let activeBookings = 0;

    const statusBreakdown = {
      hold: 0,
      reserved: 0,
      confirmed: 0,
      checkedIn: 0,
      checkedOut: 0,
      cancelled: 0,
      noShow: 0,
    };

    for (const row of rows) {
      const count = Number(row.count);
      const total = parseFloat(row.totalAmount ?? '0');
      const paid = parseFloat(row.paidAmount ?? '0');

      // Status breakdown (covers all statuses regardless of date filter)
      switch (row.status) {
        case BookingStatus.HOLD:
          statusBreakdown.hold += count;
          break;
        case BookingStatus.RESERVED:
          statusBreakdown.reserved += count;
          break;
        case BookingStatus.CONFIRMED:
          statusBreakdown.confirmed += count;
          break;
        case BookingStatus.CHECKED_IN:
          statusBreakdown.checkedIn += count;
          break;
        case BookingStatus.CHECKED_OUT:
          statusBreakdown.checkedOut += count;
          break;
        case BookingStatus.CANCELLED:
          statusBreakdown.cancelled += count;
          break;
        case BookingStatus.NO_SHOW:
          statusBreakdown.noShow += count;
          break;
      }

      // Revenue excludes CANCELLED and NO_SHOW
      if (!EXCLUDED_REVENUE_STATUSES.includes(row.status)) {
        totalRevenue += total;
        collectedRevenue += paid;
      }

      // Active booking count
      if (ACTIVE_STATUSES.includes(row.status)) {
        activeBookings += count;
      }
    }

    const pendingRevenue = +(totalRevenue - collectedRevenue).toFixed(2);
    totalRevenue = +totalRevenue.toFixed(2);
    collectedRevenue = +collectedRevenue.toFixed(2);

    // ── Room occupancy ───────────────────────────────────────────────────────
    // Total rooms for the property (ACTIVE status only)
    const totalRooms = await this.rooms.count({
      where: { propertyId, status: RoomStatus.ACTIVE },
    });

    // Occupied rooms: distinct rooms assigned to CHECKED_IN bookings
    // (i.e. currently occupied / active stays)
    const occupiedQb = this.bookingItemRooms
      .createQueryBuilder('bir')
      .innerJoin('bir.BookingItem', 'item')
      .innerJoin('item.Booking', 'booking')
      .innerJoin('bir.Room', 'room')
      .select('COUNT(DISTINCT room.id)', 'occupied')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.status = :status', { status: BookingStatus.CHECKED_IN })
      .andWhere('room.status = :roomStatus', { roomStatus: RoomStatus.ACTIVE });

    const occupiedResult = await occupiedQb.getRawOne<{ occupied: string }>();
    const occupiedRooms = Number(occupiedResult?.occupied ?? 0);

    const occupancyRate =
      totalRooms > 0
        ? +((occupiedRooms / totalRooms) * 100).toFixed(2)
        : 0;

    return {
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
      activeBookings,
      roomOccupancy: {
        occupiedRooms,
        totalRooms,
        occupancyRate,
      },
      statusBreakdown,
    };
  }
}
