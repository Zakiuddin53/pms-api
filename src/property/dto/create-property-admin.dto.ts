import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Permissions } from '../../common/permissions/permissions';
import type { Permission } from '../../common/permissions/permissions';

export class CreatePropertyAdminDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @ApiPropertyOptional()
  password?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  phone?: string;

  /**
   * Granular permissions granted by Super Admin to this admin.
   * Empty array = no access until Super Admin grants something.
   */
  @IsOptional()
  @IsArray()
  @IsEnum(Object.values(Permissions), { each: true })
  @ApiProperty({
    description: 'List of permissions to grant to the new admin',
    enum: Object.values(Permissions),
    isArray: true,
    required: false,
  })
  permissions?: Permission[];
}
