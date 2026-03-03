import { Property } from '@/property/entities/property.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomType } from '../room-types/entity/room-type.entity';
import { Room } from '../rooms/room.entity';

@Entity()
export class RoomBlock {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn()
  Property: Property;

  @Column({ nullable: true })
  roomTypeId?: number;

  @ManyToOne(() => RoomType, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  RoomType?: RoomType;

  @Column({ nullable: true })
  roomId?: number;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  Room?: Room;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
