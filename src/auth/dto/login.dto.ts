import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const AUTH_PORTALS = ['admin', 'frontdesk'] as const;
export type AuthPortal = (typeof AUTH_PORTALS)[number];

export class LoginDto {
  @IsEmail()
  @ApiProperty()
  email: string;

  @IsString()
  @MinLength(6)
  @ApiProperty()
  password: string;

  @IsOptional()
  @IsIn(AUTH_PORTALS)
  @ApiPropertyOptional({ enum: AUTH_PORTALS })
  portal?: AuthPortal;
}
