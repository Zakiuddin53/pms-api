import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { Rate } from './rates/rate.entity';
import { RatesController } from './rates/rates.controller';
import { RatesService } from './rates/rates.service';
import { RoomBlock } from './room-blocks/room-block.entity';
import { RoomBlocksController } from './room-blocks/room-blocks.controller';
import { RoomBlocksService } from './room-blocks/room-blocks.service';
import { RoomType } from './room-types/room-type.entity';
import { RoomTypesController } from './room-types/room-types.controller';
import { RoomTypesService } from './room-types/room-types.service';
import { Room } from './rooms/room.entity';
import { RoomsController } from './rooms/rooms.controller';
import { RoomsService } from './rooms/rooms.service';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomType, Room, RoomBlock, Rate]),
    CloudinaryModule,
  ],
  controllers: [
    RoomTypesController,
    RoomsController,
    RoomBlocksController,
    RatesController,
  ],
  providers: [
    RoomTypesService,
    RoomsService,
    RoomBlocksService,
    RatesService,
    JwtAuthGuard,
    PropertyRoleGuard,
    PermissionsGuard,
  ],
})
export class InventoryModule {}
