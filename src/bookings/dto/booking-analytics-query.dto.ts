import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum AnalyticsDateType {
  CHECK_IN = 'checkIn',
  CHECK_OUT = 'checkOut',
  CREATED_AT = 'createdAt',
}

export class BookingAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Filter start date (YYYY-MM-DD)' })
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-12-31', description: 'Filter end date (YYYY-MM-DD)' })
  toDate?: string;

  @IsOptional()
  @IsEnum(AnalyticsDateType)
  @ApiPropertyOptional({
    enum: AnalyticsDateType,
    default: AnalyticsDateType.CHECK_IN,
    description: 'Which date field to apply the date range filter to',
  })
  dateType?: AnalyticsDateType = AnalyticsDateType.CHECK_IN;
}
