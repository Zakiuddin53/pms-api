import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { RoomType } from './room-type.entity';
import { Amenity } from './amenity.entity';

@Entity()
export class RoomTypeAmenity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RoomType, (rt) => rt.Amenities)
  RoomType: RoomType;

  @ManyToOne(() => Amenity)
  Amenity: Amenity;
}
