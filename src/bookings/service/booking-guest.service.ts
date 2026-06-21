import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { BookingGuest } from '../entities/booking-guest.entity';
import { UserRole } from '@/common/enums/role.enum';
import { UserStatus } from '@/common/enums/status.enum';
import { CreateBookingDto } from '../dto/create-booking.dto';

@Injectable()
export class BookingGuestService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(BookingGuest)
    private readonly bookingGuests: Repository<BookingGuest>,
  ) {}

  /**
   * Find an existing guest user by phone (or email), or create a new one.
   * Updates name/email if the record already exists but data has changed.
   */
  async findOrCreateGuest(
    guestDto: CreateBookingDto['guest'],
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
   * Returns the primary guest User for a booking, or null if none.
   */
  async getPrimaryGuest(bookingId: number): Promise<User | null> {
    const bg = await this.bookingGuests.findOne({
      where: { bookingId, isPrimary: true },
      relations: { Guest: true },
    });
    return bg?.Guest ?? null;
  }

  /**
   * Adds a secondary (non-primary) guest to a booking by linking an existing
   * or newly created User through a BookingGuest row.
   */
  async addSecondaryGuest(
    bookingId: number,
    guestDto: CreateBookingDto['guest'],
  ): Promise<BookingGuest> {
    const guest = await this.findOrCreateGuest(guestDto);

    const existing = await this.bookingGuests.findOne({
      where: { bookingId, guestId: guest.id },
    });
    if (existing) return existing;

    const bg = this.bookingGuests.create({
      bookingId,
      guestId: guest.id,
      isPrimary: false,
    });
    return this.bookingGuests.save(bg);
  }
}
