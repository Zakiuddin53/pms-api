import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
  IsArray,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserIdType } from '@/common/enums/role.enum';
import { BookingSource } from '@/common/enums/booking.enum';

export class OnlineBookingGuestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '+1234567890' })
  phone: string;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  address?: string;

  @IsEnum(UserIdType)
  @IsOptional()
  @ApiPropertyOptional({ enum: UserIdType })
  idType?: UserIdType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  nationality?: string;
}

/**
 * Room item for online bookings
 * Stripped of all pricing/admin fields - prices calculated server-side
 */
export class OnlineBookingItemDto {
  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Room type ID', example: 1 })
  roomTypeId: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Number of rooms', example: 1 })
  roomsCount: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ description: 'Number of adults', example: 2 })
  adults: number;

  @IsInt()
  @Min(0)
  @ApiProperty({ description: 'Number of children', example: 0 })
  children: number;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @ApiPropertyOptional({
    description: 'IDs of the specific rooms assigned to this item',
  })
  assignedRoomIds?: number[];
}

/**
 * Online booking request DTO
 * Only accepts user input - all pricing calculated server-side
 */
export class OnlineBookingDto {
  @IsDateString()
  @ApiProperty({ example: '2026-05-21' })
  checkIn: string;

  @IsDateString()
  @ApiProperty({ example: '2026-05-22' })
  checkOut: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnlineBookingItemDto)
  @ApiProperty({ type: [OnlineBookingItemDto] })
  items: OnlineBookingItemDto[];

  @ValidateNested()
  @Type(() => OnlineBookingGuestDto)
  @ApiProperty({ type: OnlineBookingGuestDto })
  guest: OnlineBookingGuestDto;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Special requests or notes' })
  notes?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Payment gateway transaction ID' })
  paymentIntentId?: string;

  @IsEnum(BookingSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: BookingSource })
  source?: BookingSource;
}

/**
 * Response DTO for online booking creation
 */
export class OnlineBookingResponseDto {
  @ApiProperty()
  bookingId: number;

  @ApiProperty()
  bookingCode: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Payment URL for completing payment' })
  paymentUrl?: string;

  @ApiProperty()
  expiresAt: Date;
}
