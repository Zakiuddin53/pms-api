import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class ConfirmBookingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty()
  paidAmount?: number;
}
