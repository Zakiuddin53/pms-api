import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Propertie } from '../../propertie/entities/propertie.entity';
import { Rate } from '../rates/rate.entity';
import { Room } from '../rooms/room.entity';

@Entity()
export class RoomType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Propertie, (p) => p.RoomTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  Property: Propertie;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ default: 2 })
  capacity: number;

  @Column('simple-array', { nullable: true })
  amenities: string[];

  @Column({ nullable: true, type: 'json' })
  imageUrls: string[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Room, (room) => room.roomType)
  Rooms: Room[];

  @OneToMany(() => Rate, (rate) => rate.RoomType)
  Rates: Rate[];
}
