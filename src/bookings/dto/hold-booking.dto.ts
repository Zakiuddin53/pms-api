import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '@/common/enums/booking.enum';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class HoldGuestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+919876543210' })
  phone: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty({ example: 'john@example.com' })
  email?: string;
}

export class HoldBookingDto {
  @IsDateString()
  @ApiProperty({ example: '2026-03-01' })
  checkIn: string;

  @IsDateString()
  @ApiProperty({ example: '2026-03-05' })
  checkOut: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  roomTypeId: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  roomsCount: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 2 })
  adults: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0 })
  children: number;

  @IsEnum(BookingSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: BookingSource, default: BookingSource.ONLINE })
  source?: BookingSource;

  @ValidateNested()
  @Type(() => HoldGuestDto)
  @ApiProperty({ type: HoldGuestDto })
  guest: HoldGuestDto;
}
