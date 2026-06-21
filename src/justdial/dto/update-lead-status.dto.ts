import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeadStatus } from '../../common/enums/lead-status.enum';

export class UpdateLeadStatusDto {
  @IsNotEmpty()
  @IsEnum(LeadStatus)
  status: LeadStatus;
}
