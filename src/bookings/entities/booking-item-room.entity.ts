import { Room } from '@/inventory/rooms/room.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingItem } from './booking-item.entity';

@Entity()
export class BookingItemRoom {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  bookingItemId: number;

  @ManyToOne(() => BookingItem, (bi) => bi.AssignedRooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  BookingItem: BookingItem;

  @Column({ nullable: true })
  roomId?: number;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  Room?: Room;
}
