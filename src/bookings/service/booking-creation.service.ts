import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager, Brackets } from 'typeorm';
import { randomBytes } from 'crypto';
import { Booking } from '../entities/booking.entity';
import { BookingItem } from '../entities/booking-item.entity';
import { BookingItemNight } from '../entities/booking-item-night.entity';
import { BookingItemRoom } from '../entities/booking-item-room.entity';
import { BookingGuest } from '../entities/booking-guest.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { RoomType } from '../../inventory/room-types/entity/room-type.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { RoomBlock } from '../../inventory/room-blocks/room-block.entity';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { BookingLog, BookingLogAction } from '../entities/booking-log.entity';
import { BookingSource, BookingStatus } from '@/common/enums/booking.enum';
import { PaymentStatus } from '@/common/enums/status.enum';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { OnlineBookingDto } from '../dto/online-booking.dto';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingGuestService } from './booking-guest.service';
import { BookingQueryService } from './booking-query.service';
import { MailService } from '../../mail/mail.service';

const HOLD_DURATION_MINUTES = 10;

@Injectable()
export class BookingCreationService {
  private readonly logger = new Logger(BookingCreationService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
    private readonly availabilityService: BookingAvailabilityService,
    private readonly guestService: BookingGuestService,
    private readonly queryService: BookingQueryService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  async createOnlineBooking(propertyId: number, dto: OnlineBookingDto) {
    const pricedDto = await this.calculateOnlineBookingPrices(propertyId, dto);
    return this.createBookingInternal(propertyId, pricedDto);
  }
  async createAdminBooking(propertyId: number, dto: CreateBookingDto) {
    return this.createBookingInternal(propertyId, dto);
  }

  private async calculateOnlineBookingPrices(
    propertyId: number,
    dto: OnlineBookingDto,
  ): Promise<CreateBookingDto> {
    const pricedItems = await Promise.all(
      dto.items.map(async (item) => {
        const roomType = await this.roomTypes.findOne({
          where: { id: item.roomTypeId, propertyId },
        });
        if (!roomType) {
          throw new BadRequestException(
            `Room type ${item.roomTypeId} not found`,
          );
        }

        return {
          roomTypeId: item.roomTypeId,
          roomsCount: item.roomsCount,
          adults: item.adults,
          children: item.children,
          assignedRoomIds: item.assignedRoomIds,
          customRatePerNight: undefined,
          discount: 0,
          taxOverride: undefined,
        };
      }),
    );

    return {
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      items: pricedItems,
      guest: dto.guest,
      notes: dto.notes,
      source: BookingSource.ONLINE,
      isPayAtProperty: false,
      paidAmount: 0,
    };
  }

  private async createBookingInternal(
    propertyId: number,
    dto: CreateBookingDto,
  ) {
    this.availabilityService.assertValidDateRange(dto.checkIn, dto.checkOut);
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one room item is required');
    }

    const nights = this.availabilityService.expandDateRange(
      dto.checkIn,
      dto.checkOut,
    );

    const roomTypeCounts = new Map<number, number>();
    for (const item of dto.items) {
      const current = roomTypeCounts.get(item.roomTypeId) || 0;
      roomTypeCounts.set(item.roomTypeId, current + item.roomsCount);
    }

    // 2. Fetch all relevant room types once
    const roomTypes = await this.roomTypes.find({ where: { propertyId } });

    // 3. Pre-flight availability check (fast path before building pricing metadata)
    for (const [rtId, totalRequested] of roomTypeCounts.entries()) {
      const available =
        await this.availabilityService.getAvailabilityForRoomType(
          propertyId,
          rtId,
          dto.checkIn,
          dto.checkOut,
        );
      if (available < totalRequested) {
        const rt = roomTypes.find((r) => r.id === rtId);
        throw new BadRequestException(
          `Only ${available} room(s) available for ${rt?.name || rtId}`,
        );
      }
    }

    let grandSubTotal = 0;
    let grandTax = 0;
    let grandTotal = 0;
    const GST_RATE = 0.12;
    const itemMetas: {
      roomType: RoomType;
      itemDto: (typeof dto.items)[0];
      itemSubTotal: number;
      itemTax: number;
      itemTotal: number;
      exactNightPrices: number[];
    }[] = [];

    for (const itemDto of dto.items) {
      const roomType = roomTypes.find((r) => r.id === itemDto.roomTypeId);
      if (!roomType) {
        throw new BadRequestException(
          `Room type ${itemDto.roomTypeId} not found`,
        );
      }

      const pricePerNight = await this.availabilityService.requireRateMap(
        propertyId,
        itemDto.roomTypeId,
        dto.checkIn,
        dto.checkOut,
      );

      let itemSubTotal = 0;
      const exactNightPrices: number[] = [];

      const extraAdult = Number(itemDto.extraAdultCharge ?? 0);
      const extraChild = Number(itemDto.extraChildCharge ?? 0);
      const extraAdultCount = Math.max(0, itemDto.adults - roomType.maxAdults);
      const guestAddonRate =
        extraAdultCount * extraAdult + itemDto.children * extraChild;

      for (const date of nights) {
        const basePrice =
          itemDto.customRatePerNight !== undefined
            ? Number(itemDto.customRatePerNight)
            : (pricePerNight[date] ?? 0);
        const dailyRate = basePrice + guestAddonRate;
        exactNightPrices.push(dailyRate);
        itemSubTotal += dailyRate * itemDto.roomsCount;
      }

      const discount = Number(itemDto.discount ?? 0);
      itemSubTotal -= discount;

      const itemTax =
        itemDto.taxOverride !== undefined && itemDto.taxOverride !== null
          ? Number(itemDto.taxOverride)
          : Math.round(itemSubTotal * GST_RATE);

      const itemTotal = itemSubTotal + itemTax;
      grandSubTotal += itemSubTotal;
      grandTax += itemTax;
      grandTotal += itemTotal;

      itemMetas.push({
        roomType,
        itemDto,
        itemSubTotal,
        itemTax,
        itemTotal,
        exactNightPrices,
      });
    }

    const guest = await this.guestService.findOrCreateGuest(dto.guest);
    const bookingCode = await this.generateUniqueBookingCode();

    const status =
      dto.isPayAtProperty || (dto.source && dto.source !== BookingSource.ONLINE)
        ? BookingStatus.CONFIRMED
        : BookingStatus.HOLD;

    const booking = await this.dataSource.transaction(async (manager) => {
      // RE-CHECK availability inside transaction to prevent race conditions
      for (const [rtId, totalRequested] of roomTypeCounts.entries()) {
        const availableRoomIds = await this.getAvailableRoomIds(
          manager,
          propertyId,
          rtId,
          dto.checkIn,
          dto.checkOut,
        );

        if (availableRoomIds.length < totalRequested) {
          const rt = roomTypes.find((r) => r.id === rtId);
          throw new BadRequestException(
            `Only ${availableRoomIds.length} room(s) available for ${rt?.name || rtId}`,
          );
        }
      }

      const newBooking = manager.create(Booking, {
        propertyId,
        bookingCode,
        source: dto.source ?? BookingSource.ONLINE,
        status,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        subTotal: grandSubTotal,
        gstAmount: grandTax,
        totalAmount: grandTotal,
        paidAmount: dto.paidAmount ?? 0,
        notes: dto.notes?.trim() || undefined,
        holdExpiresAt:
          status === BookingStatus.HOLD ? this.getHoldExpiryDate() : null,
      });
      const savedBooking = await manager.save(Booking, newBooking);

      // Link the booking creator as the primary guest
      await manager.save(
        BookingGuest,
        manager.create(BookingGuest, {
          bookingId: savedBooking.id,
          guestId: guest.id,
          isPrimary: true,
        }),
      );

      await manager.save(
        BookingLog,
        manager.create(BookingLog, {
          bookingId: savedBooking.id,
          action: BookingLogAction.CREATED,
          description: `Booking created via ${dto.source ?? BookingSource.ONLINE}`,
          performedById: guest.id,
        }),
      );

      for (const meta of itemMetas) {
        const item = manager.create(BookingItem, {
          bookingId: savedBooking.id,
          roomTypeId: meta.itemDto.roomTypeId,
          roomsCount: meta.itemDto.roomsCount,
          adults: meta.itemDto.adults,
          children: meta.itemDto.children,
          customRatePerNight: meta.itemDto.customRatePerNight,
          extraAdultCharge: meta.itemDto.extraAdultCharge ?? 0,
          extraChildCharge: meta.itemDto.extraChildCharge ?? 0,
          discount: meta.itemDto.discount ?? 0,
          taxAmount: meta.itemTax,
          itemTotal: meta.itemTotal,
        });
        const savedItem = await manager.save(BookingItem, item);

        const nightRows = nights.map((date, index) =>
          manager.create(BookingItemNight, {
            bookingItemId: savedItem.id,
            date,
            pricePerRoom: meta.exactNightPrices[index],
          }),
        );
        await manager.save(BookingItemNight, nightRows);

        let assignedRoomIds = meta.itemDto.assignedRoomIds;
        if (!assignedRoomIds || assignedRoomIds.length === 0) {
          // Auto-assign rooms using the already-verified available IDs
          const availableIds = await this.getAvailableRoomIds(
            manager,
            propertyId,
            meta.itemDto.roomTypeId,
            dto.checkIn,
            dto.checkOut,
          );
          if (availableIds.length < meta.itemDto.roomsCount) {
            throw new BadRequestException(
              `Not enough available physical rooms for room type ${meta.itemDto.roomTypeId} (needed: ${meta.itemDto.roomsCount}, available: ${availableIds.length})`,
            );
          }
          assignedRoomIds = availableIds.slice(0, meta.itemDto.roomsCount);
        }

        if (assignedRoomIds?.length) {
          for (const roomId of assignedRoomIds) {
            await manager.save(
              BookingItemRoom,
              manager.create(BookingItemRoom, {
                bookingItemId: savedItem.id,
                Room: { id: roomId },
              }),
            );
          }
        }
      }

      if (dto.paidAmount && dto.paidAmount > 0) {
        await manager.save(
          PaymentTransaction,
          manager.create(PaymentTransaction, {
            bookingId: savedBooking.id,
            amount: dto.paidAmount,
            status: PaymentStatus.CAPTURED,
            paymentMode: dto.paymentMode,
            reference: dto.paymentReference,
          }),
        );
      }

      return savedBooking;
    });

    this.logger.log(
      `Booking ${status} created: ${bookingCode} (property=${propertyId}, total=${grandTotal})`,
    );

    const completeBooking = await this.queryService.getBookingById(
      propertyId,
      booking.id,
    );
    this.sendBookingInvoiceEmail(completeBooking).catch((err) => {
      this.logger.error(
        `Failed to send invoice email for booking ${bookingCode}: ${err?.message ?? err}`,
      );
    });

    return completeBooking;
  }

  /**
   * Sends a booking invoice/confirmation email to the primary guest.
   * Called fire-and-forget after booking creation so email failures
   * do not affect the booking response.
   */
  async sendBookingInvoiceEmail(booking: any): Promise<void> {
    const primaryGuest = booking.Guests?.find((g: any) => g.isPrimary)?.Guest;
    if (!primaryGuest?.email) {
      this.logger.warn(
        `No email found for booking ${booking.bookingCode}, skipping invoice email`,
      );
      return;
    }

    const property = booking.Property;
    if (!property) {
      this.logger.warn(
        `Property relation missing for booking ${booking.bookingCode}, skipping invoice email`,
      );
      return;
    }

    const nights =
      booking.nights ??
      this.availabilityService.expandDateRange(
        booking.checkIn,
        booking.checkOut,
      ).length;

    const rooms = booking.Items.map((item: any) => ({
      roomTypeName: item.RoomType.name,
      roomsCount: item.roomsCount,
      adults: item.adults,
      children: item.children,
      pricePerNight: Number(
        item.customRatePerNight ?? item.RoomType.baseRate ?? 0,
      ),
      nights,
      subtotal: Number(item.itemTotal) - Number(item.taxAmount),
    }));

    const totalAmount = Number(booking.totalAmount);
    const subTotal = Number(booking.subTotal);
    const taxAmount = Number(booking.gstAmount);
    const paidAmount = Number(booking.paidAmount) || 0;
    const balanceAmount = totalAmount - paidAmount;
    const discount = booking.Items.reduce(
      (sum: number, item: any) => sum + (Number(item.discount) || 0),
      0,
    );
    const paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' =
      balanceAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

    await this.mailService.sendBookingInvoice(primaryGuest.email, {
      guestName: primaryGuest.name,
      bookingCode: booking.bookingCode,
      propertyName: property.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights,
      rooms,
      subTotal,
      taxAmount,
      discount,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentStatus,
      bookingStatus: booking.status,
      isPayAtProperty:
        booking.status === BookingStatus.CONFIRMED && balanceAmount > 0,
    });

    this.logger.log(
      `Invoice email sent for booking ${booking.bookingCode} to ${primaryGuest.email}`,
    );
  }

  /**
   * Generates a unique booking code: BK-XXXXXXXX (8 hex chars).
   * The bookingCode column has a UNIQUE constraint so collisions surface as DB errors.
   */
  private async generateUniqueBookingCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const bookingCode = `BK-${randomBytes(4).toString('hex').toUpperCase()}`;
      const existing = await this.bookings.findOne({
        where: { bookingCode },
        select: { id: true },
      });
      if (!existing) return bookingCode;
    }
    throw new BadRequestException(
      'Unable to generate a unique booking code. Please try again.',
    );
  }

  private getHoldExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + HOLD_DURATION_MINUTES);
    return expiresAt;
  }

  private async getAvailableRoomIds(
    manager: EntityManager,
    propertyId: number,
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<number[]> {
    const now = new Date();

    const allRooms = await manager.find(Room, {
      where: { propertyId, roomTypeId, status: RoomStatus.ACTIVE },
      select: ['id'],
    });
    const allRoomIds = allRooms.map((r) => r.id);
    if (allRoomIds.length === 0) return [];

    const blockedRows = await manager
      .createQueryBuilder(RoomBlock, 'block')
      .select('block.roomId', 'roomId')
      .where('block.propertyId = :propertyId', { propertyId })
      .andWhere('block.roomId IS NOT NULL')
      .andWhere('block.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('block.startDate < :checkOut', { checkOut })
      .andWhere('block.endDate > :checkIn', { checkIn })
      .getRawMany<{ roomId: number }>();

    const bookedRows = await manager
      .createQueryBuilder(BookingItem, 'item')
      .select('itemRoom.roomId', 'roomId')
      .innerJoin('item.Booking', 'booking')
      .innerJoin('item.AssignedRooms', 'itemRoom')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('item.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('booking.checkIn < :checkOut', { checkOut })
      .andWhere('booking.checkOut > :checkIn', { checkIn })
      .andWhere('itemRoom.roomId IS NOT NULL')
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
      .getRawMany<{ roomId: number }>();

    const unavailableIds = new Set([
      ...blockedRows.map((r) => r.roomId),
      ...bookedRows.map((r) => r.roomId),
    ]);

    return allRoomIds.filter((id) => !unavailableIds.has(id));
  }
}
