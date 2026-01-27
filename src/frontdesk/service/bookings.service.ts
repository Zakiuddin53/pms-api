import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  Like,
  Repository,
} from 'typeorm';
import { Booking } from '../entity/booking.entity';
import { BookingItem } from '../entity/booking-item.entity';
import { Customer } from '../entity/customer.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { RoomType } from '../../inventory/room-types/room-type.entity';
import { RoomBlock } from '../../inventory/room-blocks/room-block.entity';
import { Rate } from '../../inventory/rates/rate.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { BookingSource } from '../../common/enums/booking-source.enum';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { HoldBookingDto } from '../dto/hold-booking.dto';
import { ConfirmBookingDto } from '../dto/confirm-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingItem)
    private readonly bookingItems: Repository<BookingItem>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
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
    const { checkIn, checkOut, roomTypeId } = query;
    this.assertValidDateRange(checkIn, checkOut);

    const roomTypes = await this.roomTypes.find({
      where: roomTypeId ? { propertyId, id: roomTypeId } : { propertyId },
    });
    if (roomTypes.length === 0) {
      if (roomTypeId) {
        throw new BadRequestException('Room type not found for property');
      }
      return [];
    }

    const roomTypeIds = roomTypes.map((roomType) => roomType.id);
    const totalRooms = await this.getTotalRoomsByRoomType(
      propertyId,
      roomTypeIds,
    );
    const bookedRooms = await this.getBookedRoomsByRoomType(
      propertyId,
      roomTypeIds,
      checkIn,
      checkOut,
    );
    const blockedRooms = await this.getBlockedRoomsByRoomType(
      propertyId,
      roomTypeIds,
      checkIn,
      checkOut,
      totalRooms,
    );
    const rateMaps = await this.getRateMapsByRoomType(
      propertyId,
      roomTypeIds,
      checkIn,
      checkOut,
    );

    return roomTypes.map((roomType) => {
      const totals = totalRooms.get(roomType.id) ?? 0;
      const booked = bookedRooms.get(roomType.id) ?? 0;
      const blocked = blockedRooms.get(roomType.id) ?? 0;
      const available = Math.max(0, totals - booked - blocked);
      const rateMap = rateMaps.get(roomType.id) ?? null;

      return {
        roomTypeId: roomType.id,
        roomTypeName: roomType.name,
        totalRooms: totals,
        bookedRooms: booked,
        blockedRooms: blocked,
        availableRooms: available,
        pricePerNight: rateMap,
      };
    });
  }

  async createBooking(propertyId: number, dto: HoldBookingDto) {
    this.assertValidDateRange(dto.checkIn, dto.checkOut);
    if (dto.roomsCount < 1) {
      throw new BadRequestException('Rooms count must be at least 1');
    }

    const roomType = await this.roomTypes.findOne({
      where: { id: dto.roomTypeId, propertyId },
    });

    if (!roomType) {
      throw new BadRequestException('Room type not found for property');
    }

    const available = await this.getAvailabilityForRoomType(
      propertyId,
      dto.roomTypeId,
      dto.checkIn,
      dto.checkOut,
    );

    if (available < dto.roomsCount) {
      throw new BadRequestException('Not enough availability');
    }

    const pricePerNight = await this.requireRateMap(
      propertyId,
      dto.roomTypeId,
      dto.checkIn,
      dto.checkOut,
    );
    const totalAmount = this.sumRateMap(pricePerNight) * dto.roomsCount;

    let customer = await this.customers.findOne({
      where: [{ email: dto.customer.email }, { phone: dto.customer.phone }],
    });

    if (!customer) {
      customer = this.customers.create({
        name: dto.customer.name,
        email: dto.customer.email,
        phone: dto.customer.phone,
      });
      customer = await this.customers.save(customer);
    } else if (
      customer.name !== dto.customer.name ||
      customer.email !== dto.customer.email ||
      customer.phone !== dto.customer.phone
    ) {
      customer.name = dto.customer.name;
      customer.email = dto.customer.email;
      customer.phone = dto.customer.phone;
      customer = await this.customers.save(customer);
    }

    const bookingCode = await this.generateBookingCode(
      dto.roomTypeId,
      dto.checkIn,
    );

    const booking = this.bookings.create({
      propertyId,
      bookingCode,
      source: dto.source ?? BookingSource.ONLINE,
      status: BookingStatus.HOLD,
      customerId: customer.id,
      customer,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      totalAmount,
      paidAmount: 0,
      holdExpiresAt: this.getHoldExpiryDate(),
    });

    const savedBooking = await this.bookings.save(booking);

    const bookingItem = this.bookingItems.create({
      bookingId: savedBooking.id,
      booking: savedBooking,
      roomTypeId: dto.roomTypeId,
      roomsCount: dto.roomsCount,
      adults: dto.adults,
      children: dto.children,
      pricePerNight,
      ratePlanId: null,
      roomId: null,
    });

    await this.bookingItems.save(bookingItem);

    return this.getBookingById(propertyId, savedBooking.id);
  }

  async confirmBooking(
    propertyId: number,
    bookingId: number,
    dto: ConfirmBookingDto,
  ) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
      relations: { customer: true, items: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.HOLD) {
      throw new BadRequestException('Only HOLD bookings can be confirmed');
    }

    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      throw new BadRequestException('Hold has expired');
    }

    booking.status = BookingStatus.CONFIRMED;
    booking.holdExpiresAt = null;

    if (dto.totalAmount !== undefined) {
      booking.totalAmount = dto.totalAmount;
    }

    if (dto.paidAmount !== undefined) {
      booking.paidAmount = dto.paidAmount;
    }

    await this.bookings.save(booking);
    return booking;
  }

  async getBookingById(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
      relations: { customer: true, items: { roomType: true, room: true } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async getBookingByCode(bookingCode: string) {
    const booking = await this.bookings.findOne({
      where: { bookingCode },
      relations: { customer: true, items: { roomType: true } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      bookingCode: booking.bookingCode,
      status: booking.status,
      source: booking.source,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      customer: {
        name: booking.customer?.name,
        phone: booking.customer?.phone,
        email: booking.customer?.email,
      },
      items: booking.items.map((item) => ({
        roomTypeId: item.roomTypeId,
        roomTypeName: item.roomType?.name,
        roomsCount: item.roomsCount,
        adults: item.adults,
        children: item.children,
        pricePerNight: item.pricePerNight,
      })),
    };
  }

  async cancelExpiredHolds() {
    await this.bookings
      .createQueryBuilder()
      .update(Booking)
      .set({ status: BookingStatus.CANCELLED, holdExpiresAt: null })
      .where('status = :status', { status: BookingStatus.HOLD })
      .andWhere('holdExpiresAt IS NOT NULL')
      .andWhere('holdExpiresAt <= NOW()')
      .execute();
  }

  private assertValidDateRange(checkIn: string, checkOut: string) {
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

  private async getAvailabilityForRoomType(
    propertyId: number,
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
  ) {
    const totalRooms = await this.getTotalRoomsByRoomType(
      propertyId,
      [roomTypeId],
    );
    const bookedRooms = await this.getBookedRoomsByRoomType(
      propertyId,
      [roomTypeId],
      checkIn,
      checkOut,
    );
    const blockedRooms = await this.getBlockedRoomsByRoomType(
      propertyId,
      [roomTypeId],
      checkIn,
      checkOut,
      totalRooms,
    );

    const totals = totalRooms.get(roomTypeId) ?? 0;
    const booked = bookedRooms.get(roomTypeId) ?? 0;
    const blocked = blockedRooms.get(roomTypeId) ?? 0;

    return Math.max(0, totals - booked - blocked);
  }

  private async getTotalRoomsByRoomType(
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

    return new Map(
      rows.map((row) => [Number(row.roomTypeId), Number(row.count)]),
    );
  }

  private async getBookedRoomsByRoomType(
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
      .innerJoin('item.booking', 'booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('item.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('booking.checkIn < :checkOut', { checkOut })
      .andWhere('booking.checkOut > :checkIn', { checkIn })
      .andWhere(
        new Brackets((qb) => {
          qb.where('booking.status IN (:...activeStatuses)', {
            activeStatuses: [
              BookingStatus.CONFIRMED,
              BookingStatus.CHECKED_IN,
            ],
          }).orWhere(
            'booking.status = :holdStatus AND booking.holdExpiresAt > :now',
            { holdStatus: BookingStatus.HOLD, now },
          );
        }),
      )
      .groupBy('item.roomTypeId')
      .getRawMany<{ roomTypeId: string; count: string }>();

    return new Map(
      rows.map((row) => [Number(row.roomTypeId), Number(row.count)]),
    );
  }

  private async getBlockedRoomsByRoomType(
    propertyId: number,
    roomTypeIds: number[],
    checkIn: string,
    checkOut: string,
    totalRooms: Map<number, number>,
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

    const blockedByRoomType = new Set(
      roomTypeBlocks
        .filter((row) => Number(row.count) > 0)
        .map((row) => Number(row.roomTypeId)),
    );

    const result = new Map<number, number>();
    for (const roomTypeId of roomTypeIds) {
      const total = totalRooms.get(roomTypeId) ?? 0;
      const blockedRoomsCount = blockedByRoomType.has(roomTypeId)
        ? total
        : blockedByRoomId.get(roomTypeId) ?? 0;
      result.set(roomTypeId, Math.min(total, blockedRoomsCount));
    }

    return result;
  }

  private async getRateMapsByRoomType(
    propertyId: number,
    roomTypeIds: number[],
    checkIn: string,
    checkOut: string,
  ): Promise<Map<number, Record<string, number> | null>> {
    const dates = this.expandDateRange(checkIn, checkOut);
    const lastNight = dates[dates.length - 1];
    if (!lastNight) {
      return new Map();
    }

    const rates = await this.rates
      .createQueryBuilder('rate')
      .where('rate.propertyId = :propertyId', { propertyId })
      .andWhere('rate.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('rate.startDate <= :lastNight', { lastNight })
      .andWhere('rate.endDate >= :checkIn', { checkIn })
      .getMany();

    const rateMap = new Map<number, Record<string, number> | null>();
    for (const roomTypeId of roomTypeIds) {
      const ratesForType = rates.filter(
        (rate) => rate.roomTypeId === roomTypeId,
      );
      const perNight: Record<string, number> = {};
      let complete = true;

      for (const date of dates) {
        const rate = ratesForType.find(
          (entry) => entry.startDate <= date && entry.endDate >= date,
        );
        if (!rate) {
          complete = false;
          break;
        }
        perNight[date] = Number(rate.price);
      }

      rateMap.set(roomTypeId, complete ? perNight : null);
    }

    return rateMap;
  }

  private async requireRateMap(
    propertyId: number,
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
  ) {
    const dates = this.expandDateRange(checkIn, checkOut);
    const lastNight = dates[dates.length - 1];
    if (!lastNight) {
      throw new BadRequestException('Invalid stay dates');
    }

    const rates = await this.rates
      .createQueryBuilder('rate')
      .where('rate.propertyId = :propertyId', { propertyId })
      .andWhere('rate.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('rate.startDate <= :lastNight', { lastNight })
      .andWhere('rate.endDate >= :checkIn', { checkIn })
      .getMany();

    const perNight: Record<string, number> = {};
    for (const date of dates) {
      const rate = rates.find(
        (entry) => entry.startDate <= date && entry.endDate >= date,
      );
      if (!rate) {
        throw new BadRequestException('Rates are missing for selected dates');
      }
      perNight[date] = Number(rate.price);
    }
    return perNight;
  }

  private expandDateRange(checkIn: string, checkOut: string) {
    const dates: string[] = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    for (
      let cursor = new Date(start);
      cursor < end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      dates.push(cursor.toISOString().slice(0, 10));
    }

    return dates;
  }

  private sumRateMap(rateMap: Record<string, number>) {
    return Object.values(rateMap).reduce((sum, value) => sum + value, 0);
  }

  private getHoldExpiryDate() {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    return expiresAt;
  }

  private async generateBookingCode(
    roomTypeId: number,
    checkIn: string,
  ) {
    const formattedRoomType = String(roomTypeId).padStart(2, '0');
    const date = new Date(checkIn);
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `BK${formattedRoomType}`;
    const suffix = await this.getNextBookingSuffix(prefix, day);

    return `${prefix}${suffix}${day}`;
  }

  private async getNextBookingSuffix(
    prefix: string,
    day: string,
  ) {
    const existingCodes = await this.bookings.find({
      select: { bookingCode: true },
      where: { bookingCode: Like(`${prefix}__${day}`) },
    });

    const existingSuffixes = new Set(
      existingCodes
        .map((row) => row.bookingCode)
        .filter((code) => code?.startsWith(prefix) && code.length >= 6)
        .map((code) => code.slice(prefix.length, prefix.length + 2)),
    );

    for (let sequence = 1; sequence <= 99; sequence += 1) {
      const suffix = String(sequence).padStart(2, '0');
      const candidate = `${prefix}${suffix}${day}`;
      if (!existingSuffixes.has(suffix)) {
        return suffix;
      }

      const alreadyUsed = await this.bookings.findOne({
        where: { bookingCode: candidate },
      });
      if (!alreadyUsed) {
        return suffix;
      }
    }

    throw new BadRequestException('Unable to generate booking code');
  }
}
