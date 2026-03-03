import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateRateDto {
  @IsInt()
  @Min(1)
  @ApiProperty()
  roomTypeId!: number;

  @IsDateString()
  @ApiProperty()
  startDate: string;

  @IsDateString()
  @ApiProperty()
  endDate: string;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  price: number;
}
