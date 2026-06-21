import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserIdType } from '@/common/enums/role.enum';

class RoomAssignmentDto {
  @IsInt()
  bookingItemId: number;

  @IsInt()
  roomId: number;
}

export class CheckInDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomAssignmentDto)
  roomAssignments?: RoomAssignmentDto[];

  @IsOptional()
  @IsEnum(UserIdType)
  idType?: UserIdType;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  idFrontUrl?: string;

  @IsOptional()
  @IsString()
  idBackUrl?: string;
}
