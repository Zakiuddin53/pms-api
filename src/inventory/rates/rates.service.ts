import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { RoomType } from '../room-types/room-type.entity';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { Rate } from './rate.entity';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly rates: Repository<Rate>,
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
  ) {}

  async create(propertyId: number, dto: CreateRateDto) {
    const roomType = await this.roomTypes.findOne({
      where: { id: dto.roomTypeId, propertyId },
    });
    if (!roomType) {
      throw new BadRequestException('Room type not found for property');
    }

    const rate = this.rates.create({
      propertyId,
      roomTypeId: dto.roomTypeId,
      date: dto.date,
      price: dto.price,
    });
    return this.rates.save(rate);
  }

  async list(propertyId: number, query: PaginateQuery) {
    return paginate(query, this.rates, {
      sortableColumns: ['date', 'price', 'roomTypeId'],
      filterableColumns: {
        roomTypeId: [FilterOperator.EQ],
        date: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.EQ],
        price: [FilterOperator.GTE, FilterOperator.LTE],
      },
      where: { propertyId },
    });
  }

  async getById(propertyId: number, id: number) {
    const rate = await this.rates.findOne({ where: { id, propertyId } });
    if (!rate) {
      throw new NotFoundException('Rate not found');
    }
    return rate;
  }

  async update(propertyId: number, id: number, dto: UpdateRateDto) {
    const rate = await this.getById(propertyId, id);

    if (dto.roomTypeId) {
      const roomType = await this.roomTypes.findOne({
        where: { id: dto.roomTypeId, propertyId },
      });
      if (!roomType) {
        throw new BadRequestException('Room type not found for property');
      }
    }

    const updated = this.rates.merge(rate, {
      roomTypeId: dto.roomTypeId ?? rate.roomTypeId,
      date: dto.date ?? rate.date,
      price: dto.price ?? rate.price,
    });
    return this.rates.save(updated);
  }

  async remove(propertyId: number, id: number) {
    const rate = await this.getById(propertyId, id);
    await this.rates.remove(rate);
    return { deleted: true };
  }
}
