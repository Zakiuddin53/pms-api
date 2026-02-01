import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoomType } from '../../inventory/room-types/room-type.entity';
import { UserPropertyRole } from './user-property-role.entity';

@Entity()
export class Propertie {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  pinCode: number;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('float', { default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column('simple-array', { nullable: true })
  amenities: string[];

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserPropertyRole, (membership) => membership.property)
  memberships: UserPropertyRole[];

  @OneToMany(() => RoomType, (roomType) => roomType.property)
  roomTypes: RoomType[];
}
