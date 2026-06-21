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

export enum BookingLogAction {
  CREATED = 'CREATED',
  PAYMENT_ADDED = 'PAYMENT_ADDED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  GUEST_ADDED = 'GUEST_ADDED',
  ROOM_CHANGE = 'ROOM_CHANGE',
  EXTENDED = 'EXTENDED',
  EARLY_CHECKOUT = 'EARLY_CHECKOUT',
}

@Entity()
export class BookingLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingId: number;

  @Column({ type: 'enum', enum: BookingLogAction, enumName: 'booking_log_action' })
  action: BookingLogAction;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  performedById?: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Booking, (b) => b.Logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  Booking: Booking;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'performedById' })
  PerformedBy?: User;
}
