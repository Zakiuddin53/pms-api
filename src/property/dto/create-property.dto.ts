import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PropertyType } from '@/common/enums/property-type.enum';

class CreatePropertyAboutDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  checkInTime?: string;

  @IsString()
  @IsOptional()
  checkOutTime?: string;
}

class CreatePropertyContactDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  googleMapUrl?: string;
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  pinCode: string;

  @IsEnum(PropertyType)
  @IsNotEmpty()
  propertyType: PropertyType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalRooms?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePropertyContactDto)
  contact?: CreatePropertyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePropertyAboutDto)
  about?: CreatePropertyAboutDto;
}
