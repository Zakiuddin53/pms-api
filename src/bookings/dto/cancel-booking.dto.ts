import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @ApiProperty()
  reason?: string;
}
