import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Property } from "./property.entity";

@Entity()
export class PropertyContact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  propertyId: number;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  googleMapUrl?: string;

  @OneToOne(() => Property, (p) => p.Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  Property: Property;
}
