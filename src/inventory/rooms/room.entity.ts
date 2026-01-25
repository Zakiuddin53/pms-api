import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { Propertie } from '../../propertie/entities/propertie.entity';
import { RoomType } from '../room-types/room-type.entity';

@Entity()
export class Room {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Propertie, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  property: Propertie;

  @Column()
  roomTypeId: number;

  @ManyToOne(() => RoomType, (roomType) => roomType.rooms, {
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
}
