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
import { Booking } from '@/bookings/entities/booking.entity';
import { UserRole } from '@/common/enums/role.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
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
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  idType?: string; // 'AADHAR' | 'PASSPORT' | 'DRIVING_LICENSE'

  @Column({ nullable: true })
  idNumber?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Staff only
  @OneToMany(() => UserPropertyRole, (m) => m.User)
  PropertyRoles: UserPropertyRole[];

  // Guest only
  @OneToMany(() => Booking, (b) => b.Guest)
  Bookings: Booking[];
}
