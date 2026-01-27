import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Rate {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  propertyId: number;

  @Column()
  roomTypeId: number;

  @Column()
  startDate: string;

  @Column()
  endDate: string;

  @Column()
  price: number;
}
