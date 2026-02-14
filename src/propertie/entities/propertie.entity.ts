import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomType } from '../../inventory/room-types/room-type.entity';
import { UserPropertyRole } from './user-property-role.entity';
import { PropertyContact } from './property-contact.entity';
import { PropertyAbout } from './property-about.entity';

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
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true, type: 'json' })
  imageUrls: string[];

  @Column('float', { default: 0 })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserPropertyRole, (ur) => ur.Property)
  UserRole: UserPropertyRole[];

  @OneToMany(() => RoomType, (roomType) => roomType.Property)
  RoomTypes: RoomType[];

  @OneToOne(() => PropertyContact, (c) => c.Property)
  Contact: PropertyContact;

  @OneToOne(() => PropertyAbout, (a) => a.Property)
  PropertyAbout: PropertyAbout;
}
