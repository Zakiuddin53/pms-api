import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '@/common/enums/booking.enum';
import { OfflinePaymentMode } from '@/bookings/entities/payment-transaction.entity';
import { UserIdType } from '@/common/enums/role.enum';

export class BookingGuestDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
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

export class BookingItemDto {
  @IsInt()
  @Min(1)
  @ApiProperty()
  roomTypeId: number;

  @IsInt()
  @Min(1)
  @ApiProperty()
  roomsCount: number;

  @IsInt()
  @Min(0)
  @ApiProperty()
  adults: number;

  @IsInt()
  @Min(0)
  @ApiProperty()
  children: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ description: 'Override the default price per night' })
  customRatePerNight?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  extraAdultCharge?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  extraChildCharge?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  discount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  taxOverride?: number;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @ApiPropertyOptional({
    description: 'IDs of the specific rooms assigned to this item',
  })
  assignedRoomIds?: number[];
}

export class CreateBookingDto {
  @IsDateString()
  @ApiProperty()
  checkIn: string;

  @IsDateString()
  @ApiProperty()
  checkOut: string;

  @IsEnum(BookingSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: BookingSource })
  source?: BookingSource;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  @ApiProperty({ type: [BookingItemDto] })
  items: BookingItemDto[];

  @ValidateNested()
  @Type(() => BookingGuestDto)
  @ApiProperty({ type: BookingGuestDto })
  guest: BookingGuestDto;

  @IsBoolean()
  @IsOptional()
  isPayAtProperty?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  notes?: string;

  @IsEnum(OfflinePaymentMode)
  @IsOptional()
  @ApiPropertyOptional({ enum: OfflinePaymentMode })
  paymentMode?: OfflinePaymentMode;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  paidAmount?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  paymentReference?: string;
}
