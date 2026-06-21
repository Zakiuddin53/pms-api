import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingLifecycleService } from './booking-lifecycle.service';

@Injectable()
export class BookingCleanupService {
  constructor(private readonly lifecycleService: BookingLifecycleService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredHolds() {
    await this.lifecycleService.cancelExpiredHolds();
  }
}
