import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { BookingSource } from '../../common/enums/booking-source.enum';
import { Customer } from './customer.entity';
import { BookingItem } from './booking-item.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'property_id' })
  propertyId: number;

  @Column({ name: 'booking_code', unique: true })
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

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'check_in', type: 'date' })
  checkIn: string;

  @Column({ name: 'check_out', type: 'date' })
  checkOut: string;

  @Column({ name: 'total_amount', type: 'numeric', default: 0 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'numeric', default: 0 })
  paidAmount: number;

  @Column({ name: 'hold_expires_at', type: 'timestamp', nullable: true })
  holdExpiresAt?: Date | null;

  @OneToMany(() => BookingItem, (item) => item.booking)
  items: BookingItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
