import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrontdeskController } from './frontdesk.controller';
import { Booking } from './booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  controllers: [FrontdeskController],
})
export class FrontdeskModule {}
