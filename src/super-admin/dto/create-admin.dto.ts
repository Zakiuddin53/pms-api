import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsInt()
  @Min(1)
  propertyId!: number;
}
