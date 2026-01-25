import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateRateDto {
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
