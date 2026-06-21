import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePropertyStaffDto {
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
}
