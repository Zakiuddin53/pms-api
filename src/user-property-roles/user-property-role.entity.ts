import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Propertie } from '../propertie/entities/propertie.entity';
import { User } from '../users/user.entity';
import { PropertyRole } from 'src/common/enums/property-role.enum';

@Entity()
export class UserPropertyRole {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  userId: number;

  @Column({  nullable: true })
  propertyId: number | null;

  @Column({
    type: 'enum',
    enum: PropertyRole,
    enumName: 'property_role',
  })
  role: PropertyRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.propertyRoles)
  @JoinColumn()
  user: User;

  @ManyToOne(() => Propertie, (property) => property.memberships, {
    nullable: true,
  })
  @JoinColumn()
  property?: Propertie | null;
}
