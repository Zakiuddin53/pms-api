import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JustdialLead } from '../entities/justdial-lead.entity';
import { JustdialLeadWebhookDto } from '../dto/webhook-lead.dto';
import { Property } from '../../property/entities/property.entity';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { JUSTDIAL_LEAD_PAGINATION_CONFIG } from '../config/justdial-lead.pagination';
import { JwtPayload } from '../../common/types/auth.types';

@Injectable()
export class JustdialService implements OnModuleInit {
  private readonly logger = new Logger(JustdialService.name);
  private propertyId: number | undefined;

  constructor(
    @InjectRepository(JustdialLead)
    private readonly leadRepository: Repository<JustdialLead>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const slug =
      this.configService.get<string>('JUSTDIAL_PROPERTY_SLUG') ??
      'arooba-residency';
    const property = await this.propertyRepository.findOne({
      where: { slug },
      select: { id: true },
    });

    if (!property) {
      this.logger.warn(
        `Property "${slug}" not found. Leads will have null propertyId.`,
      );
    }
    this.propertyId = property?.id;
  }

  async handleWebhook(dto: JustdialLeadWebhookDto): Promise<string> {
    try {
      const newLead = this.leadRepository.create({
        ...dto,
        propertyId: this.propertyId,
        rawPayload: dto,
      });

      await this.leadRepository.save(newLead);
      this.logger.log(`Lead saved — ${dto.leadid} | ${dto.mobile}`);
    } catch (error: any) {
      if (error?.code === '23505' || error?.code === 'ER_DUP_ENTRY') {
        this.logger.debug(`Duplicate lead — ${dto.leadid}`);
        return 'SUCCESS';
      }

      this.logger.error(`Failed to save lead ${dto.leadid}`, error.stack);
      throw new InternalServerErrorException('Failed to process lead');
    }

    return 'RECEIVED';
  }

  async findAll(query: PaginateQuery) {
    return paginate(
      query,
      this.leadRepository,
      JUSTDIAL_LEAD_PAGINATION_CONFIG,
    );
  }

  async findOne(id: number): Promise<JustdialLead> {
    const lead = await this.leadRepository.findOneOrFail({
      where: { id },
      relations: ['Property'],
    });
    return lead;
  }

  async updateStatus(
    id: number,
    dto: UpdateLeadStatusDto,
  ): Promise<JustdialLead> {
    const lead = await this.findOne(id);
    lead.status = dto.status;
    return this.leadRepository.save(lead);
  }

  async exportNumbersCsv(): Promise<string> {
    const leads = await this.leadRepository.find({ select: ['mobile'] });
    return leads.map((l) => l.mobile).join('\n');
  }
}
