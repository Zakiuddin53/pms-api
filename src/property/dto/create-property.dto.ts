import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PropertyType } from '@/common/enums/property-type.enum';
import { ApiProperty } from '@nestjs/swagger';

class CreatePropertyAboutDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  description?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  checkInTime?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  checkOutTime?: string;
}

class CreatePropertyContactDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  googleMapUrl?: string;
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  pinCode: string;

  @IsEnum(PropertyType)
  @IsNotEmpty()
  @ApiProperty()
  propertyType: PropertyType;

  @IsOptional()
  @IsString()
  @ApiProperty()
  city?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  state?: string;

  @IsNumber()
  @ApiProperty()
  rating: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePropertyContactDto)
  @ApiProperty()
  contact?: CreatePropertyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePropertyAboutDto)
  @ApiProperty()
  about?: CreatePropertyAboutDto;
}
