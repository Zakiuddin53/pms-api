import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Booking } from '../entities/booking.entity';
import { BookingItem } from '../entities/booking-item.entity';
import { BookingItemNight } from '../entities/booking-item-night.entity';
import { BookingItemRoom } from '../entities/booking-item-room.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { RoomType } from '../../inventory/room-types/entity/room-type.entity';
import { RoomBlock } from '../../inventory/room-blocks/room-block.entity';
import { Rate } from '../../inventory/rates/rate.entity';
import { User } from '../../users/user.entity';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { HoldBookingDto } from '../dto/hold-booking.dto';
import { ListBookingsQueryDto } from '../dto/list-bookings-query.dto';
import { BookingSource, BookingStatus } from '@/common/enums/booking.enum';
import { UserStatus } from '@/common/enums/status.enum';
import { UserRole } from '@/common/enums/role.enum';
import { PaymentStatus } from '@/common/enums/status.enum';

/** GST rate applied to all bookings (12%) */
const GST_RATE = 0.12;
const HOLD_DURATION_MINUTES = 10;

export interface SavePaymentTransactionDto {
  bookingId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingItem)
    private readonly bookingItems: Repository<BookingItem>,
    @InjectRepository(BookingItemNight)
    private readonly bookingItemNights: Repository<BookingItemNight>,
    @InjectRepository(BookingItemRoom)
    private readonly bookingItemRooms: Repository<BookingItemRoom>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactions: Repository<PaymentTransaction>,
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
    @InjectRepository(RoomBlock)
    private readonly roomBlocks: Repository<RoomBlock>,
    @InjectRepository(Rate)
    private readonly rates: Repository<Rate>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async getAvailability(propertyId: number, query: AvailabilityQueryDto) {
    const { checkIn, checkOut, roomTypeId } = query;
    this.assertValidDateRange(checkIn, checkOut);

    const roomTypeList = await this.roomTypes.find({
      where: roomTypeId ? { propertyId, id: roomTypeId } : { propertyId },
    });

    if (roomTypeList.length === 0) {
      if (roomTypeId) {
        throw new BadRequestException('Room type not found for property');
      }
      return [];
    }

    const roomTypeIds = roomTypeList.map((rt) => rt.id);
    const [totalRooms, bookedRooms, blockedRooms, rateMaps] = await Promise.all(
      [
        this.getTotalRoomsByRoomType(propertyId, roomTypeIds),
        this.getBookedRoomsByRoomType(
          propertyId,
          roomTypeIds,
          checkIn,
          checkOut,
        ),
        this.getBlockedRoomsByRoomType(
          propertyId,
          roomTypeIds,
          checkIn,
          checkOut,
        ),
        this.getRateMapsByRoomType(propertyId, roomTypeIds, checkIn, checkOut),
      ],
    );

    return roomTypeList.map((rt) => {
      const totals = totalRooms.get(rt.id) ?? 0;
      const booked = bookedRooms.get(rt.id) ?? 0;
      const blocked = blockedRooms.get(rt.id) ?? 0;
      const available = Math.max(0, totals - booked - blocked);
      const rateMap = rateMaps.get(rt.id) ?? null;

      return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
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
      throw new BadRequestException(
        `Not enough availability: only ${available} room(s) available`,
      );
    }

    const pricePerNight = await this.requireRateMap(
      propertyId,
      dto.roomTypeId,
      dto.checkIn,
      dto.checkOut,
    );

    const baseAmount = this.sumRateMap(pricePerNight) * dto.roomsCount;
    const gstAmount = Math.round(baseAmount * GST_RATE);
    const totalAmount = baseAmount + gstAmount;

    const guest = await this.findOrCreateGuest(dto.guest);

    const bookingCode = this.generateBookingCode();

    const booking = this.bookings.create({
      propertyId,
      bookingCode,
      source: dto.source ?? BookingSource.ONLINE,
      status: BookingStatus.HOLD,
      guestId: guest.id,
      Guest: guest,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      subTotal: baseAmount,
      gstAmount,
      totalAmount,
      paidAmount: 0,
      holdExpiresAt: this.getHoldExpiryDate(),
    });

    const savedBooking = await this.bookings.save(booking);

    const bookingItem = this.bookingItems.create({
      bookingId: savedBooking.id,
      Booking: savedBooking,
      roomTypeId: dto.roomTypeId,
      roomsCount: dto.roomsCount,
      adults: dto.adults,
      children: dto.children,
      itemTotal: this.sumRateMap(pricePerNight) * dto.roomsCount,
    });

    const savedItem = await this.bookingItems.save(bookingItem);

    const nightRows = Object.entries(pricePerNight).map(([date, price]) =>
      this.bookingItemNights.create({
        bookingItemId: savedItem.id,
        date,
        pricePerRoom: price,
      }),
    );
    await this.bookingItemNights.save(nightRows);

    this.logger.log(
      `Booking HOLD created: ${bookingCode} (property=${propertyId}, total=${totalAmount})`,
    );

    return this.getBookingById(propertyId, savedBooking.id);
  }

  async getBookingById(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
      relations: {
        Guest: true,
        Items: {
          RoomType: true,
          Nights: true,
          AssignedRooms: true,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async getBookingByCode(bookingCode: string) {
    const booking = await this.bookings.findOne({
      where: { bookingCode },
      relations: {
        Guest: true,
        Items: { RoomType: true, Nights: true },
      },
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
      subTotal: booking.subTotal,
      gstAmount: booking.gstAmount,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      guest: {
        name: booking.Guest?.name,
        phone: booking.Guest?.phone,
        email: booking.Guest?.email,
      },
      items: booking.Items?.map((item) => ({
        roomTypeId: item.roomTypeId,
        roomTypeName: item.RoomType?.name,
        roomsCount: item.roomsCount,
        adults: item.adults,
        children: item.children,
        itemTotal: item.itemTotal,
        nights: item.Nights?.map((n) => ({
          date: n.date,
          pricePerRoom: n.pricePerRoom,
        })),
      })),
    };
  }

  async getBookingByRazorpayOrderId(razorpayOrderId: string) {
    const transaction = await this.paymentTransactions.findOne({
      where: { razorpayOrderId },
      relations: { Booking: true },
    });
    return transaction?.Booking ?? null;
  }

  async listBookings(propertyId: number, query: ListBookingsQueryDto) {
    const { status, fromDate, toDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.bookings
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.Guest', 'guest')
      .leftJoinAndSelect('booking.Items', 'items')
      .leftJoinAndSelect('items.RoomType', 'roomType')
      .where('booking.propertyId = :propertyId', { propertyId })
      .orderBy('booking.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }
    if (fromDate) {
      qb.andWhere('booking.checkIn >= :fromDate', { fromDate });
    }
    if (toDate) {
      qb.andWhere('booking.checkIn <= :toDate', { toDate });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelBooking(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const cancellableStatuses = [
      BookingStatus.HOLD,
      BookingStatus.CONFIRMED,
    ] as string[];

    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Booking with status ${booking.status} cannot be cancelled`,
      );
    }

    booking.status = BookingStatus.CANCELLED;
    booking.holdExpiresAt = null;
    await this.bookings.save(booking);

    this.logger.log(`Booking ${booking.bookingCode} cancelled`);

    return { success: true, status: BookingStatus.CANCELLED };
  }

  async checkIn(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only CONFIRMED bookings can be checked in',
      );
    }

    booking.status = BookingStatus.CHECKED_IN;
    await this.bookings.save(booking);

    this.logger.log(`Booking ${booking.bookingCode} checked in`);

    return { success: true, status: BookingStatus.CHECKED_IN };
  }

  async checkOut(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        'Only CHECKED_IN bookings can be checked out',
      );
    }

    booking.status = BookingStatus.CHECKED_OUT;
    await this.bookings.save(booking);

    this.logger.log(`Booking ${booking.bookingCode} checked out`);

    return { success: true, status: BookingStatus.CHECKED_OUT };
  }

  async markConfirmed(bookingId: number, paidAmount: number): Promise<Booking> {
    const booking = await this.bookings.findOne({
      where: { id: bookingId },
      relations: { Guest: true, Items: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return booking;
    }

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

  async savePaymentTransaction(
    dto: SavePaymentTransactionDto,
  ): Promise<PaymentTransaction> {
    const tx = this.paymentTransactions.create({
      bookingId: dto.bookingId,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
      amount: dto.amount,
      status: PaymentStatus.CAPTURED,
    });
    return this.paymentTransactions.save(tx);
  }

  async createPendingPaymentTransaction(
    bookingId: number,
    razorpayOrderId: string,
    amount: number,
  ): Promise<PaymentTransaction> {
    const tx = this.paymentTransactions.create({
      bookingId,
      razorpayOrderId,
      amount,
      status: PaymentStatus.PENDING,
    });
    return this.paymentTransactions.save(tx);
  }

  async getLatestCapturedPaymentTransaction(
    bookingId: number,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactions.findOne({
      where: { bookingId, status: PaymentStatus.CAPTURED },
      order: { createdAt: 'DESC' },
    });
  }

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
  ): Promise<number> {
    const [totalRooms, bookedRooms, blockedRooms] = await Promise.all([
      this.getTotalRoomsByRoomType(propertyId, [roomTypeId]),
      this.getBookedRoomsByRoomType(
        propertyId,
        [roomTypeId],
        checkIn,
        checkOut,
      ),
      this.getBlockedRoomsByRoomType(
        propertyId,
        [roomTypeId],
        checkIn,
        checkOut,
      ),
    ]);

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

    return new Map(
      rows.map((row) => [Number(row.roomTypeId), Number(row.count)]),
    );
  }

  private async getBlockedRoomsByRoomType(
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

    const totalRooms = await this.getTotalRoomsByRoomType(
      propertyId,
      roomTypeIds,
    );

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

  private async getRateMapsByRoomType(
    propertyId: number,
    roomTypeIds: number[],
    checkIn: string,
    checkOut: string,
  ): Promise<Map<number, Record<string, number> | null>> {
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

    const rateMap = new Map<number, Record<string, number> | null>();
    for (const roomTypeId of roomTypeIds) {
      const ratesForType = rateEntries.filter(
        (r) => r.roomTypeId === roomTypeId,
      );
      const perNight: Record<string, number> = {};
      let complete = true;

      for (const date of dates) {
        const rate = ratesForType.find((r) => {
          const start = this.formatDate(r.startDate);
          const end = this.formatDate(r.endDate);
          return start <= date && end >= date;
        });

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
  ): Promise<Record<string, number>> {
    const dates = this.expandDateRange(checkIn, checkOut);
    const lastNight = dates[dates.length - 1];

    if (!lastNight) {
      throw new BadRequestException('Invalid stay dates');
    }

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

      if (!rate) {
        throw new BadRequestException(
          `No rate configured for ${date}. Please set up rates before accepting bookings.`,
        );
      }
      perNight[date] = Number(rate.price);
    }

    return perNight;
  }

  private async findOrCreateGuest(
    guestDto: HoldBookingDto['guest'],
  ): Promise<User> {
    const whereConditions: any[] = [{ phone: guestDto.phone }];
    if (guestDto.email) {
      whereConditions.push({ email: guestDto.email });
    }

    let guest = await this.users.findOne({ where: whereConditions });

    if (!guest) {
      guest = this.users.create({
        userRole: UserRole.GUEST,
        name: guestDto.name,
        phone: guestDto.phone,
        email: guestDto.email ?? null,
        status: UserStatus.ACTIVE,
      });
      return this.users.save(guest);
    }
    let dirty = false;
    if (guest.name !== guestDto.name) {
      guest.name = guestDto.name;
      dirty = true;
    }
    if (guestDto.email && guest.email !== guestDto.email) {
      guest.email = guestDto.email;
      dirty = true;
    }

    return dirty ? this.users.save(guest) : guest;
  }

  /**
   * Generates a globally-unique booking code using the last 8 characters of a
   * UUID. The `bookingCode` column carries a UNIQUE constraint, so a collision
   * (astronomically unlikely) will surface as a DB error rather than silently
   * producing a duplicate.
   * Format: BK-XXXXXXXX  (e.g. BK-1a2b3c4d)
   */
  private generateBookingCode(): string {
    return `BK-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private expandDateRange(checkIn: string, checkOut: string): string[] {
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

  private formatDate(val: unknown): string {
    if (!val) return '';
    const d = new Date(val as string);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toISOString().slice(0, 10);
  }

  private sumRateMap(rateMap: Record<string, number>): number {
    return Object.values(rateMap).reduce((sum, value) => sum + value, 0);
  }

  private getHoldExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + HOLD_DURATION_MINUTES);
    return expiresAt;
  }
}
