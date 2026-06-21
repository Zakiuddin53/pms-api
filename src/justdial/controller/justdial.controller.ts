import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  Header,
} from '@nestjs/common';
import { JustdialService } from '../services/justdial.service';
import { JustdialLeadWebhookDto } from '../dto/webhook-lead.dto';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { JustdialLead } from '../entities/justdial-lead.entity';
import { JustdialApiKeyGuard } from '@/common/guards/justdial-api-key.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('justdial')
export class JustdialController {
  constructor(private readonly justdialService: JustdialService) {}

  @Post('leads')
  @UseGuards(JustdialApiKeyGuard)
  @HttpCode(200)
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async receiveLead(@Body() dto: JustdialLeadWebhookDto) {
    return this.justdialService.handleWebhook(dto);
  }

  @Get('leads')
  @UseGuards(JwtAuthGuard)
  async getLeads(@Paginate() query: PaginateQuery) {
    return this.justdialService.findAll(query);
  }

  @Get('leads/export/csv')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="leads_numbers.csv"')
  async exportNumbersCsv(): Promise<string> {
    return this.justdialService.exportNumbersCsv();
  }

  @Get('leads/:id')
  @UseGuards(JwtAuthGuard)
  async getLead(@Param('id') id: number): Promise<JustdialLead> {
    return this.justdialService.findOne(id);
  }

  @Patch('leads/:id')
  @UseGuards(JwtAuthGuard)
  async updateLeadStatus(
    @Param('id') id: number,
    @Body() dto: UpdateLeadStatusDto,
  ): Promise<JustdialLead> {
    return this.justdialService.updateStatus(id, dto);
  }
}
