import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm";
import { Property } from "./property.entity";

@Entity()
export class PropertyAbout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  propertyId: number;

  @OneToOne(() => Property, (p) => p.PropertyAbout, { onDelete: 'CASCADE' })
  @JoinColumn()
  Property: Property;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  checkInTime?: string; 

  @Column({ nullable: true })
  checkOutTime?: string; 
}
