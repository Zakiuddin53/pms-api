import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CheckOutDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ description: 'If true, bypasses balance and pending ID validations (Admin only)' })
  force?: boolean;
}
