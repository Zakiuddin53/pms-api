import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateRoomTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAdults?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxChildren?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(Number);
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  amenityIds?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
