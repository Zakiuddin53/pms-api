import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomType } from '../../inventory/room-types/entity/room-type.entity';
import { UserPropertyRole } from './user-property-role.entity';
import { PropertyContact } from './property-contact.entity';
import { PropertyAbout } from './property-about.entity';
import { PropertyType } from '@/common/enums/property-type.enum';
import { PropertyPolicy } from './property-policy.entity';
import { User } from '../../users/user.entity';

@Entity()
export class Property {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ type: 'enum', enum: PropertyType, enumName: 'property_type' })
  propertyType: PropertyType;

  @Column({ type: 'varchar', length: 10 })
  pinCode: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true, type: 'json' })
  imageUrls: string[];

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: true })
  isActive: boolean;

  // The user who created / owns this property
  @Column({ nullable: true })
  ownerId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  Owner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserPropertyRole, (ur) => ur.Property)
  UserRole: UserPropertyRole[];

  @OneToMany(() => RoomType, (roomType) => roomType.Property)
  RoomTypes: RoomType[];

  @OneToOne(() => PropertyContact, (c) => c.Property)
  Contact: PropertyContact;

  @OneToOne(() => PropertyAbout, (a) => a.Property)
  PropertyAbout: PropertyAbout;

  @OneToMany(() => PropertyPolicy, (p) => p.Property)
  Policies: PropertyPolicy[];
}
