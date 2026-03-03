import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { RoomType } from '../../inventory/room-types/entity/room-type.entity';
import { BookingItemNight } from './booking-item-night.entity';
import { BookingItemRoom } from './booking-item-room.entity';

@Entity()
export class BookingItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingId: number;

  @Column()
  roomTypeId: number;

  @Column({ default: 1 })
  roomsCount: number;

  @Column({ default: 1 })
  adults: number;

  @Column({ default: 0 })
  children: number;

  @Column('decimal', { precision: 12, scale: 2 })
  itemTotal: number; // sum of per-night prices × roomsCount

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => BookingItemNight, (n) => n.BookingItem)
  Nights: BookingItemNight[];

  @OneToMany(() => BookingItemRoom, (r) => r.BookingItem)
  AssignedRooms: BookingItemRoom[];

  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT' })
  @JoinColumn()
  RoomType: RoomType;

  @ManyToOne(() => Booking, (b) => b.Items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  Booking: Booking;
}
