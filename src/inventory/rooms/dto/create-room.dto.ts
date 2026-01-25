import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RoomStatus } from '../../../common/enums/room-status.enum';

export class CreateRoomDto {
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @IsString()
  roomNumber!: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
