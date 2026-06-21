import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyController } from './controller/property.controller';
import { Property } from './entities/property.entity';
import { PropertyService } from './services/property.service';
import { User } from '../users/user.entity';
import { UserPropertyRole } from './entities/user-property-role.entity';
import { PropertyContact } from './entities/property-contact.entity';
import { PropertyAbout } from './entities/property-about.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { PropertyPolicy } from './entities/property-policy.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { Policy } from './entities/policy.entity';
import { PolicyService } from './services/policy.service';
import { PolicyController } from './controller/policy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      User,
      UserPropertyRole,
      PropertyContact,
      PropertyAbout,
      PropertyPolicy,
      Policy,
    ]),
    CloudinaryModule,
    AuthModule,
    MailModule,
  ],
  controllers: [PropertyController, PolicyController],
  providers: [
    PropertyService,
    PolicyService,
    JwtAuthGuard,
    PropertyRoleGuard,
    PermissionsGuard,
    SuperAdminGuard,
  ],
})
export class PropertyModule {}
