import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingItem } from './booking-item.entity';
import { BookingSource, BookingStatus } from '@/common/enums/booking.enum';
import { User } from '@/users/user.entity';
import { PaymentTransaction } from './payment-transaction.entity';

@Entity()
@Index(['propertyId', 'checkIn', 'checkOut'])
export class Booking {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @Column()
  bookingCode: string;

  @Column({
    type: 'enum',
    enum: BookingSource,
    enumName: 'booking_source',
  })
  source: BookingSource;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.HOLD,
  })
  status: BookingStatus;

  @Column()
  guestId: number;

  @ManyToOne(() => User, (u) => u.Bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guestId' })
  Guest: User;

  @Column({ type: 'date' })
  checkIn: string;

  @Column({ type: 'date' })
  checkOut: string;

  @Column('decimal', { precision: 12, scale: 2 })
  subTotal: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  gstAmount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ nullable: true })
  holdExpiresAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BookingItem, (item) => item.Booking)
  Items: BookingItem[];

  @OneToMany(() => PaymentTransaction, (p) => p.Booking)
  Payments: PaymentTransaction[];
}
