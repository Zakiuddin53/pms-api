import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Propertie } from "./propertie.entity";

@Entity()
export class PropertyContact {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Propertie)
  @JoinColumn()
  Property: Propertie;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  googleMapUrl?: string;
}
