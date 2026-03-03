import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { PropertyRole } from '@/common/enums/role.enum';
import { Property } from './property.entity';

@Entity()
export class UserPropertyRole {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, (u) => u.PropertyRoles, { onDelete: 'CASCADE' })
  @JoinColumn()
  User: User;

  @Column({ nullable: true })
  propertyId: number | null;

  @ManyToOne(() => Property, (p) => p.UserRole, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  Property: Property;

  @Column({ type: 'enum', enum: PropertyRole })
  role: PropertyRole

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

