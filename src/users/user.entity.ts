import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPropertyRole } from '../property/entities/user-property-role.entity';
import { UserStatus } from '@/common/enums/status.enum';
import { BookingGuest } from '@/bookings/entities/booking-guest.entity';
import { PropertyRole, UserIdType, UserRole } from '@/common/enums/role.enum';
import type { Permission } from '@/common/permissions/permissions';

@Entity()
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_type',
    default: UserRole.STAFF,
  })
  userRole: UserRole;

  @Column({
    type: 'enum',
    enum: PropertyRole,
    enumName: 'property_role',
    nullable: true,
  })
  role: PropertyRole;

  @Column({ type: 'simple-array', nullable: true })
  permissions: Permission[];

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserIdType,
    nullable: true,
  })
  idType?: UserIdType;

  @Column({ nullable: true })
  idFrontUrl?: string;

  @Column({ nullable: true })
  idBackUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserPropertyRole, (m) => m.User)
  PropertyRoles: UserPropertyRole[];

  @OneToMany(() => BookingGuest, (bg) => bg.Guest)
  BookingGuests: BookingGuest[];
}
