import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertieDto } from './create-propertie.dto';

export class UpdatePropertieDto extends PartialType(CreatePropertieDto) {}
