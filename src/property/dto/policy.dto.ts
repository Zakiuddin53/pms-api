import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { PolicyType } from '@/common/enums/policy-type.enum';

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(PolicyType)
  policyType: PolicyType;
}

export class AssignPolicyDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  propertyIds: number[];
}
