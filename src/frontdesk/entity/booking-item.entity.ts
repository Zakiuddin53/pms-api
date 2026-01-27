import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Room } from '../../inventory/rooms/room.entity';
import { RoomType } from '../../inventory/room-types/room-type.entity';

@Entity('booking_items')
export class BookingItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'booking_id' })
  bookingId: number;

  @ManyToOne(() => Booking, (booking) => booking.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'room_type_id' })
  roomTypeId: number;

  @ManyToOne(() => RoomType, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'room_type_id' })
  roomType: RoomType;

  @Column({ name: 'rate_plan_id', type: 'int', nullable: true })
  ratePlanId?: number | null;

  @Column({ name: 'room_id', type: 'int', nullable: true })
  roomId?: number | null;

  @ManyToOne(() => Room, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'room_id' })
  room?: Room | null;

  @Column({ name: 'rooms_count', type: 'int' })
  roomsCount: number;

  @Column({ type: 'int' })
  adults: number;

  @Column({ type: 'int' })
  children: number;

  @Column({ name: 'price_per_night', type: 'jsonb' })
  pricePerNight: Record<string, number>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
