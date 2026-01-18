import { IsString } from 'class-validator';

export class CreatePropertieDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  timezone!: string;

  @IsString()
  currency!: string;
}
