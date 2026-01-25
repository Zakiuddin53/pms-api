import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rates')
export class Rate {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'property_id', type: 'int' })
  propertyId: number;

  @Column({ name: 'room_type_id', type: 'int' })
  roomTypeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric' })
  price: number;
}
