import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './booking.entity';

@Controller('frontdesk')
export class FrontdeskController {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
  ) {}

  @Get('bookings')
  async listBookings(@Req() req: Request) {
    return this.bookings.find({
      where: { propertyId: req.propertyId },
      order: { createdAt: 'DESC' },
    });
  }
}
