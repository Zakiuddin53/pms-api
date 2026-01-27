import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateRateDto {
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
