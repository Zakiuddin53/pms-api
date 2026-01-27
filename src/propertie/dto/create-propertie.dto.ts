import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePropertieDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @IsNotEmpty()
  pinCode: number;

}
