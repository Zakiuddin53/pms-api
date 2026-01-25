import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Propertie } from '../../propertie/entities/propertie.entity';
import { Room } from '../rooms/room.entity';

@Entity()
export class RoomType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Propertie, (property) => property.roomTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  property: Propertie;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Room, (room) => room.roomType)
  rooms: Room[];
}
