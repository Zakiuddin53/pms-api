import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Propertie } from '../propertie/entities/propertie.entity';
import { User } from './user.entity';
import { UserPropertyRole } from '../propertie/entities/user-property-role.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Propertie, UserPropertyRole])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
