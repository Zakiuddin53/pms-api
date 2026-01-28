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

@Entity()
export class BookingItem {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingId: number;

  @ManyToOne(() => Booking, (booking) => booking.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  booking: Booking;

  @Column()
  roomTypeId: number;

  @ManyToOne(() => RoomType, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn()
  roomType: RoomType;

  @Column({ nullable: true })
  ratePlanId?: number | null;

  @Column({ nullable: true })
  roomId?: number;

  @ManyToOne(() => Room, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  room?: Room | null;

  @Column()
  roomsCount: number;

  @Column()
  adults: number;

  @Column()
  children: number;

  @Column({type: 'jsonb' })
  pricePerNight: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}
