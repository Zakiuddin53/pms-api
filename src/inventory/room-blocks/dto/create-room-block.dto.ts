import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomBlockDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  roomId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  roomTypeId?: number | null;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string | null;
}
