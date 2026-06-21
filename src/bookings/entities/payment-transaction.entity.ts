import { PaymentStatus } from '@/common/enums/status.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

export enum OfflinePaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

@Entity()
export class PaymentTransaction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingId: number;

  @ManyToOne(() => Booking, (b) => b.Payments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bookingId' })
  Booking: Booking;

  @Column({ nullable: true })
  razorpayOrderId?: string;

  @Column({ nullable: true })
  razorpayPaymentId?: string;

  @Column({ nullable: true })
  razorpaySignature?: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: OfflinePaymentMode,
    enumName: 'offline_payment_mode',
    nullable: true,
  })
  paymentMode?: OfflinePaymentMode;

  @Column({ nullable: true })
  reference?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
