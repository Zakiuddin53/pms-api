import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BookingSource } from '../../common/enums/booking-source.enum';

class HoldCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  email: string;
}

export class HoldBookingDto {
  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsInt()
  @Min(1)
  roomTypeId: number;

  @IsInt()
  @Min(1)
  roomsCount: number;

  @IsInt()
  @Min(0)
  adults: number;

  @IsInt()
  @Min(0)
  children: number;

  @IsEnum(BookingSource)
  source: BookingSource;

  @ValidateNested()
  @Type(() => HoldCustomerDto)
  customer: HoldCustomerDto;
}
