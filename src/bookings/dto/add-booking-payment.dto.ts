import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { OfflinePaymentMode } from '../entities/payment-transaction.entity';

export class AddBookingPaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(OfflinePaymentMode)
  paymentMode: OfflinePaymentMode;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  notes?: string;
}
