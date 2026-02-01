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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;
}
