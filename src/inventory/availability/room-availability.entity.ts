import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from '@/property/entities/property.entity';
import { RoomType } from '../room-types/entity/room-type.entity';

@Entity()
@Index(['roomTypeId', 'date'], { unique: true })
export class RoomAvailability {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn()
  Property: Property;

  @Column()
  roomTypeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: 0 })
  totalRooms: number;

  @Column({ default: 0 })
  blockedRooms: number;

  @Column({ default: 0 })
  bookedRooms: number;

  // availableRooms = totalRooms - blockedRooms - bookedRooms (compute in service)

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => RoomType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomTypeId' })
  RoomType: RoomType;
}
