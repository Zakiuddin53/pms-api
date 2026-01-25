import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('room_blocks')
export class RoomBlock {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'property_id', type: 'int' })
  propertyId: number;

  @Column({ name: 'room_id', type: 'int', nullable: true })
  roomId?: number | null;

  @Column({ name: 'room_type_id', type: 'int', nullable: true })
  roomTypeId?: number | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;
}
