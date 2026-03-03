import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomType } from '../room-types/entity/room-type.entity';
import { Property } from '@/property/entities/property.entity';

@Entity()
@Index(['roomTypeId', 'startDate', 'endDate'])
export class Rate {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @Column()
  roomTypeId: number;

  @ManyToOne(() => RoomType, (roomType) => roomType.Rates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  RoomType: RoomType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @ManyToOne(() => Property, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  Property: Property;
}
