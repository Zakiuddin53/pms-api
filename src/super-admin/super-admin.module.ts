import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Propertie } from '../propertie/entities/propertie.entity';
import { User } from '../users/user.entity';
import { UserPropertyRole } from '../user-property-roles/user-property-role.entity';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Propertie, UserPropertyRole])],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
