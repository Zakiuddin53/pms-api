import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString()
  @ApiProperty({ example: '2026-03-01' })
  checkIn: string;

  @IsDateString()
  @ApiProperty({ example: '2026-03-05' })
  checkOut: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional()
  roomTypeId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  children?: number;
}
