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

@Entity()
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
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.bookings, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn()
  customer: Customer;

  @Column()
  checkIn: string;

  @Column()
  checkOut: string;

  @Column()
  totalAmount: number;

  @Column()
  paidAmount: number;

  @Column({ nullable: true })
  holdExpiresAt?: Date ;

  @OneToMany(() => BookingItem, (item) => item.booking)
  items: BookingItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
