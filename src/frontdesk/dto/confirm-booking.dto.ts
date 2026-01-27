import { IsNumber, IsOptional, Min } from 'class-validator';

export class ConfirmBookingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}
