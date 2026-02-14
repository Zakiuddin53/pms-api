import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePropertieDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  pinCode: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsObject()
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    googleMapUrl?: string;
  };

  @IsOptional()
  @IsObject()
  about?: {
    about?: string;
    policies?: string;
  };


  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;
}
