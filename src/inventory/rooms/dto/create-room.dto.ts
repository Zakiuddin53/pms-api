import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RoomStatus } from '../../../common/enums/room-status.enum';

export class CreateRoomDto {
  @ApiProperty({ example: 1, description: 'ID of the room type' })
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @ApiProperty({
    example: '101',
    description: 'Unique room number within the property',
  })
  @IsString()
  roomNumber!: string;

  @ApiPropertyOptional({
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
    description: 'Room operational status',
  })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
