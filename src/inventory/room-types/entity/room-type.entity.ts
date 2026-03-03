import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Property } from '../../../property/entities/property.entity';
import { Rate } from '../../rates/rate.entity';
import { Room } from '../../rooms/room.entity';
import { RoomTypeAmenity } from './room-type-amenity.entity';

@Entity()
export class RoomType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, (p) => p.RoomTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  Property: Property;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 2 })
  maxAdults: number;

  @Column({ default: 0 })
  maxChildren: number;

  @Column('decimal', { precision: 10, scale: 2 })
  defaultPrice: number;

  @Column({ nullable: true, type: 'json' })
  imageUrls: string[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Room, (room) => room.roomType)
  Rooms: Room[];

  @OneToMany(() => Rate, (rate) => rate.RoomType)
  Rates: Rate[];

  @OneToMany(() => RoomTypeAmenity, (a) => a.RoomType)
  Amenities: RoomTypeAmenity[];
}
