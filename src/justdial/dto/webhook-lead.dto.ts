import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsEmail,
} from 'class-validator';

export class JustdialLeadWebhookDto {
  @IsNotEmpty()
  @IsString()
  leadid: string;

  @IsOptional()
  @IsString()
  leadtype?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  brancharea?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsIn([0, 1])
  dncmobile?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsIn([0, 1])
  dncphone?: number;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  branchpin?: string;

  @IsOptional()
  @IsString()
  parentid?: string;
}
