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
import { Property } from '@/property/entities/property.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { BookingGuest } from './booking-guest.entity';
import { BookingLog } from './booking-log.entity';

@Entity()
@Index(['propertyId', 'checkIn', 'checkOut'])
@Index(['bookingCode'], { unique: true })
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

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  Property: Property;

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

  @OneToMany(() => BookingGuest, (bg) => bg.Booking, { cascade: true })
  Guests: BookingGuest[];

  @OneToMany(() => BookingLog, (bl) => bl.Booking)
  Logs: BookingLog[];
}
