import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyController } from './property.controller';
import { Property } from './entities/property.entity';
import { PropertyService } from './property.service';
import { User } from '../users/user.entity';
import { UserPropertyRole } from './entities/user-property-role.entity';
import { PropertyContact } from './entities/property-contact.entity';
import { PropertyAbout } from './entities/property-about.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { PropertyPolicy } from './entities/property-policy.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      User,
      UserPropertyRole,
      PropertyContact,
      PropertyAbout,
      PropertyPolicy,
    ]),
    CloudinaryModule,
    AuthModule,
    MailModule,
  ],
  controllers: [PropertyController],
  providers: [
    PropertyService,
    JwtAuthGuard,
    PropertyRoleGuard,
    PermissionsGuard,
  ],
})
export class PropertyModule {}
