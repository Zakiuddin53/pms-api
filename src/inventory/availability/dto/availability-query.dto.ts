import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityRangeQueryDto {
  /** Start of the date window to query (inclusive), format: YYYY-MM-DD */
  @IsDateString()
  startDate!: string;

  /** End of the date window to query (inclusive), format: YYYY-MM-DD */
  @IsDateString()
  endDate!: string;

  /** Optionally narrow results to a single room type */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId?: number;
}
