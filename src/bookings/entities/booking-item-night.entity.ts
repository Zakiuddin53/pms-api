import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingItem } from './booking-item.entity';

@Entity()
export class BookingItemNight {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingItemId: number;

  @ManyToOne(() => BookingItem, (bi) => bi.Nights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingItemId' })
  BookingItem: BookingItem;

  @Column({ type: 'date' })
  date: string;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerRoom: number;
}
