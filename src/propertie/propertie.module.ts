import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertieController } from './propertie.controller';
import { Propertie } from './entities/propertie.entity';
import { PropertieService } from './propertie.service';
import { User } from '../users/user.entity';
import { UserPropertyRole } from './entities/user-property-role.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Propertie, User, UserPropertyRole]),
    CloudinaryModule,
  ],
  controllers: [PropertieController],
  providers: [
    PropertieService,
    JwtAuthGuard,
    PropertyRoleGuard,
    PermissionsGuard,
  ],
})
export class PropertieModule {}
