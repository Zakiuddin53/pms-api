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
  pinCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserPropertyRole, (membership) => membership.property)
  memberships: UserPropertyRole[];

  @OneToMany(() => RoomType, (roomType) => roomType.property)
  roomTypes: RoomType[];
}
