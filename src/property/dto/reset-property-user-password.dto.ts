import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPropertyUserPasswordDto {
  @IsString()
  @MinLength(8)
  @ApiProperty()
  password: string;
}
