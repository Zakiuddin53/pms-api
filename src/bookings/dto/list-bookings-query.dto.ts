import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@/common/enums/booking.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListBookingsQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  @ApiProperty({ enum: BookingStatus })
  status?: BookingStatus;

  @IsOptional()
  @ApiProperty({
    example: '2026-03-01',
  })
  fromDate?: string;

  @IsOptional()
  @ApiProperty({
    example: '2026-03-31',
  })
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiProperty()
  limit?: number = 20;
}
