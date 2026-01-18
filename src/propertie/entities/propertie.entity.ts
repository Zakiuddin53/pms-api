import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserPropertyRole } from '../../user-property-roles/user-property-role.entity';

@Entity('properties')
export class Propertie {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  timezone: string;

  @Column()
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => UserPropertyRole, (membership) => membership.property)
  memberships: UserPropertyRole[];
}
