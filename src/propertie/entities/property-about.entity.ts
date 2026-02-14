import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column } from "typeorm";
import { Propertie } from "./propertie.entity";

@Entity()
export class PropertyAbout {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Propertie)
  @JoinColumn()
  Property: Propertie;

  @Column({ type: 'text', nullable: true })
  about: string;

  @Column({ type: 'text', nullable: true })
  policies: string;

}       