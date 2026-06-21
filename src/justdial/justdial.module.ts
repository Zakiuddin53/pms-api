import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JustdialLead } from './entities/justdial-lead.entity';
import { Property } from '../property/entities/property.entity';
import { JustdialController } from './controller/justdial.controller';
import { JustdialService } from './services/justdial.service';

@Module({
  imports: [TypeOrmModule.forFeature([JustdialLead, Property])],
  controllers: [JustdialController],
  providers: [JustdialService],
  exports: [JustdialService],
})
export class JustdialModule {}
