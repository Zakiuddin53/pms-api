import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Permissions } from '../../common/permissions/permissions';
import type { Permission } from '../../common/permissions/permissions';

export class UpdatePropertyUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(Object.values(Permissions), { each: true })
  permissions?: Permission[];
}
