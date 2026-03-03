import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 42 })
  bookingId: number;

  @IsOptional()
  @Min(1)
  @ApiPropertyOptional({
    description: 'Partial refund amount in INR. Omit for full refund.',
    example: 500,
  })
  amount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Guest requested cancellation' })
  reason?: string;
}
