import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { RoomType } from '../room-types/entity/room-type.entity';
import { Property } from '@/property/entities/property.entity';

@Entity()
@Index(['propertyId', 'roomNumber'], { unique: true })
export class Room {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @Column()
  roomTypeId: number;

  @ManyToOne(() => RoomType, (roomType) => roomType.Rooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  roomType: RoomType;

  @Column()
  roomNumber: string;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    enumName: 'room_status',
    default: RoomStatus.ACTIVE,
  })
  status: RoomStatus;

  @ManyToOne(() => Property, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  Property: Property;
}
