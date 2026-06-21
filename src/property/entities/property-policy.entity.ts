import { PolicyType } from '@/common/enums/policy-type.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';
import { Policy } from './policy.entity';

@Entity()
export class PropertyPolicy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, (p) => p.Policies, { onDelete: 'CASCADE' })
  @JoinColumn()
  Property: Property;

  @Column({ nullable: true })
  policyId: number | null;

  @ManyToOne(() => Policy, (p) => p.PropertyPolicies, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'policyId' })
  Policy: Policy;

  @Column({ type: 'enum', enum: PolicyType })
  policyType: PolicyType;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
