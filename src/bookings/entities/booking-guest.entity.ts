import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from '@/users/user.entity';

@Entity()
export class BookingGuest {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingId: number;

  @Column()
  guestId: number;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Booking, (b) => b.Guests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  Booking: Booking;

  @ManyToOne(() => User, (u) => u.BookingGuests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guestId' })
  Guest: User;
}
