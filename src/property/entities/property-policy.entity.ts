import { PolicyType } from "@/common/enums/policy-type.enum";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Property } from "./property.entity";

@Entity()
export class PropertyPolicy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => Property, (p) => p.Policies, { onDelete: 'CASCADE' })
  @JoinColumn()
  Property: Property;

  @Column({ type: 'enum', enum: PolicyType })
  policyType: PolicyType;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
