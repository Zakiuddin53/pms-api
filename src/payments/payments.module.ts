import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { FrontdeskModule } from '../frontdesk/frontdesk.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, FrontdeskModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
