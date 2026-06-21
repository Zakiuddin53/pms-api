import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { BookingItem } from '../entities/booking-item.entity';
import { RoomBlock } from '../../inventory/room-blocks/room-block.entity';
import { RoomType } from '../../inventory/room-types/entity/room-type.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { Rate } from '../../inventory/rates/rate.entity';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { BookingStatus } from '@/common/enums/booking.enum';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';

@Injectable()
export class BookingAvailabilityService {
  constructor(
    @InjectRepository(BookingItem)
    private readonly bookingItems: Repository<BookingItem>,
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
    @InjectRepository(RoomBlock)
    private readonly roomBlocks: Repository<RoomBlock>,
    @InjectRepository(Rate)
    private readonly rates: Repository<Rate>,
  ) {}

  async getAvailability(propertyId: number, query: AvailabilityQueryDto) {
    const { checkIn, checkOut, roomTypeId, adults, children } = query;
    this.assertValidDateRange(checkIn, checkOut);

    const where: any = { propertyId };
    if (roomTypeId) where.id = roomTypeId;

    const roomTypeList = await this.roomTypes.find({ where });
    const filteredRoomTypes = roomTypeList.filter((rt) => {
      const adultsOk = !adults || rt.maxAdults >= adults;
      const childrenOk = !children || rt.maxChildren >= children;
      return adultsOk && childrenOk;
    });

    if (filteredRoomTypes.length === 0) return [];

    const roomTypeIds = filteredRoomTypes.map((rt) => rt.id);
    const [totalRooms, bookedRooms, blockedRooms, rateMaps] = await Promise.all(
      [
        this.getTotalRoomsByRoomType(propertyId, roomTypeIds),
        this.getBookedRoomsByRoomType(propertyId, roomTypeIds, checkIn, checkOut),
        this.getBlockedRoomsByRoomType(propertyId, roomTypeIds, checkIn, checkOut),
        this.getRateMapsByRoomType(filteredRoomTypes, checkIn, checkOut),
      ],
    );

    return filteredRoomTypes.map((rt) => {
      const totals = totalRooms.get(rt.id) ?? 0;
      const booked = bookedRooms.get(rt.id) ?? 0;
      const blocked = blockedRooms.get(rt.id) ?? 0;
      const available = Math.max(0, totals - booked - blocked);
      const rateMap = rateMaps.get(rt.id) ?? {};
      const totalStayPrice = this.sumRateMap(rateMap);
      const nights = Object.keys(rateMap).length || 1;

      return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        totalRooms: totals,
        availableRooms: available,
        totalPrice: totalStayPrice,
        avgPricePerNight: Math.round(totalStayPrice / nights),
        priceBreakdown: rateMap,
      };
    });
  }

  async getAvailabilityForRoomType(
    propertyId: number,
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<number> {
    const [totalRooms, bookedRooms, blockedRooms] = await Promise.all([
      this.getTotalRoomsByRoomType(propertyId, [roomTypeId]),
      this.getBookedRoomsByRoomType(propertyId, [roomTypeId], checkIn, checkOut),
      this.getBlockedRoomsByRoomType(propertyId, [roomTypeId], checkIn, checkOut),
    ]);

    const totals = totalRooms.get(roomTypeId) ?? 0;
    const booked = bookedRooms.get(roomTypeId) ?? 0;
    const blocked = blockedRooms.get(roomTypeId) ?? 0;
    return Math.max(0, totals - booked - blocked);
  }

  async getRateMapsByRoomType(
    roomTypes: RoomType[],
    checkIn: string,
    checkOut: string,
  ): Promise<Map<number, Record<string, number>>> {
    const propertyId = roomTypes[0]?.propertyId;
    const roomTypeIds = roomTypes.map((rt) => rt.id);
    const dates = this.expandDateRange(checkIn, checkOut);
    const lastNight = dates[dates.length - 1];

    if (!lastNight) return new Map();

    const rateEntries = await this.rates
      .createQueryBuilder('rate')
      .where('rate.propertyId = :propertyId', { propertyId })
      .andWhere('rate.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('rate.startDate <= :lastNight', { lastNight })
      .andWhere('rate.endDate >= :checkIn', { checkIn })
      .getMany();

    const rateMap = new Map<number, Record<string, number>>();

    for (const rt of roomTypes) {
      const ratesForType = rateEntries.filter((r) => r.roomTypeId === rt.id);
      const perNight: Record<string, number> = {};

      for (const date of dates) {
        const rate = ratesForType.find((r) => {
          const start = this.formatDate(r.startDate);
          const end = this.formatDate(r.endDate);
          return start <= date && end >= date;
        });
        perNight[date] = rate ? Number(rate.price) : Number(rt.defaultPrice);
      }

      rateMap.set(rt.id, perNight);
    }

    return rateMap;
  }

  async requireRateMap(
    propertyId: number,
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<Record<string, number>> {
    const dates = this.expandDateRange(checkIn, checkOut);
    const lastNight = dates[dates.length - 1];

    if (!lastNight) throw new BadRequestException('Invalid stay dates');

    const rateEntries = await this.rates
      .createQueryBuilder('rate')
      .where('rate.propertyId = :propertyId', { propertyId })
      .andWhere('rate.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('rate.startDate <= :lastNight', { lastNight })
      .andWhere('rate.endDate >= :checkIn', { checkIn })
      .getMany();

    const perNight: Record<string, number> = {};
    for (const date of dates) {
      const rate = rateEntries.find((entry) => {
        const start = this.formatDate(entry.startDate);
        const end = this.formatDate(entry.endDate);
        return start <= date && end >= date;
      });

      // FALLBACK: Use defaultPrice if specialized rate is missing
      if (rate) {
        perNight[date] = Number(rate.price);
      } else {
        const roomType = await this.roomTypes.findOne({ where: { id: roomTypeId } });
        perNight[date] = Number(roomType?.defaultPrice ?? 0);
      }
    }

    return perNight;
  }

  async getTotalRoomsByRoomType(
    propertyId: number,
    roomTypeIds: number[],
  ): Promise<Map<number, number>> {
    const rows = await this.rooms
      .createQueryBuilder('room')
      .select('room.roomTypeId', 'roomTypeId')
      .addSelect('COUNT(*)', 'count')
      .where('room.propertyId = :propertyId', { propertyId })
      .andWhere('room.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('room.status = :status', { status: RoomStatus.ACTIVE })
      .groupBy('room.roomTypeId')
      .getRawMany<{ roomTypeId: string; count: string }>();

    return new Map(rows.map((row) => [Number(row.roomTypeId), Number(row.count)]));
  }

  async getBookedRoomsByRoomType(
    propertyId: number,
    roomTypeIds: number[],
    checkIn: string,
    checkOut: string,
  ): Promise<Map<number, number>> {
    const now = new Date();
    const rows = await this.bookingItems
      .createQueryBuilder('item')
      .select('item.roomTypeId', 'roomTypeId')
      .addSelect('SUM(item.roomsCount)', 'count')
      .innerJoin('item.Booking', 'booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('item.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('booking.checkIn < :checkOut', { checkOut })
      .andWhere('booking.checkOut > :checkIn', { checkIn })
      .andWhere(
        new Brackets((qb) => {
          qb.where('booking.status IN (:...activeStatuses)', {
            activeStatuses: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
          }).orWhere(
            'booking.status = :holdStatus AND booking.holdExpiresAt > :now',
            { holdStatus: BookingStatus.HOLD, now },
          );
        }),
      )
      .groupBy('item.roomTypeId')
      .getRawMany<{ roomTypeId: string; count: string }>();

    return new Map(rows.map((row) => [Number(row.roomTypeId), Number(row.count)]));
  }

  async getBlockedRoomsByRoomType(
    propertyId: number,
    roomTypeIds: number[],
    checkIn: string,
    checkOut: string,
  ): Promise<Map<number, number>> {
    const roomBlockRows = await this.roomBlocks
      .createQueryBuilder('block')
      .select('room.roomTypeId', 'roomTypeId')
      .addSelect('COUNT(DISTINCT block.roomId)', 'count')
      .innerJoin(Room, 'room', 'room.id = block.roomId')
      .where('block.propertyId = :propertyId', { propertyId })
      .andWhere('block.roomId IS NOT NULL')
      .andWhere('room.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('block.startDate < :checkOut', { checkOut })
      .andWhere('block.endDate > :checkIn', { checkIn })
      .groupBy('room.roomTypeId')
      .getRawMany<{ roomTypeId: string; count: string }>();

    const blockedByRoomId = new Map(
      roomBlockRows.map((row) => [Number(row.roomTypeId), Number(row.count)]),
    );

    const roomTypeBlocks = await this.roomBlocks
      .createQueryBuilder('block')
      .select('block.roomTypeId', 'roomTypeId')
      .addSelect('COUNT(*)', 'count')
      .where('block.propertyId = :propertyId', { propertyId })
      .andWhere('block.roomTypeId IS NOT NULL')
      .andWhere('block.startDate < :checkOut', { checkOut })
      .andWhere('block.endDate > :checkIn', { checkIn })
      .andWhere('block.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .groupBy('block.roomTypeId')
      .getRawMany<{ roomTypeId: string; count: string }>();

    const fullyBlockedRoomTypes = new Set(
      roomTypeBlocks
        .filter((row) => Number(row.count) > 0)
        .map((row) => Number(row.roomTypeId)),
    );

    const totalRooms = await this.getTotalRoomsByRoomType(propertyId, roomTypeIds);

    const result = new Map<number, number>();
    for (const id of roomTypeIds) {
      const total = totalRooms.get(id) ?? 0;
      const count = fullyBlockedRoomTypes.has(id)
        ? total
        : (blockedByRoomId.get(id) ?? 0);
      result.set(id, Math.min(total, count));
    }

    return result;
  }

  assertValidDateRange(checkIn: string, checkOut: string): void {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (Number.isNaN(checkInDate.valueOf())) {
      throw new BadRequestException('Invalid check-in date');
    }
    if (Number.isNaN(checkOutDate.valueOf())) {
      throw new BadRequestException('Invalid check-out date');
    }
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('Check-out must be after check-in');
    }
  }

  expandDateRange(checkIn: string, checkOut: string): string[] {
    const dates: string[] = [];
    const end = new Date(checkOut);
    for (
      let cursor = new Date(checkIn);
      cursor < end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    return dates;
  }

  formatDate(val: unknown): string {
    if (!val) return '';
    const d = new Date(val as string);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toISOString().slice(0, 10);
  }

  private sumRateMap(rateMap: Record<string, number>): number {
    return Object.values(rateMap).reduce((sum, value) => sum + value, 0);
  }
}
