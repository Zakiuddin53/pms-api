import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LeadStatus } from '../../common/enums/lead-status.enum';
import { Property } from '../../property/entities/property.entity';

@Entity()
export class JustdialLead {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  leadid: string;

  @Column({ nullable: true })
  leadtype: string;

  @Column({ nullable: true })
  prefix: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  mobile: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  date: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  area: string;

  @Column({ nullable: true })
  brancharea: string;

  @Column({ type: 'int', default: 0 })
  dncmobile: number;

  @Column({ type: 'int', default: 0 })
  dncphone: number;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({ nullable: true })
  time: string;

  @Column({ nullable: true })
  branchpin: string;

  @Column({ nullable: true })
  parentid: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({ nullable: true })
  propertyId: number;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  Property: Property;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'json', nullable: true })
  rawPayload: any;
}
