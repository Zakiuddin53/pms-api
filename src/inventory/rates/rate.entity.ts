import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Propertie } from '../../propertie/entities/propertie.entity';
import { RoomType } from '../room-types/room-type.entity';

@Entity()
export class Rate {
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

  @ManyToOne(() => RoomType, (roomType) => roomType.Rates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  RoomType: RoomType;

  @Column({ type: 'timestamp' })
  startDate: string;

  @Column({ type: 'timestamp' })
  endDate: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;
}
