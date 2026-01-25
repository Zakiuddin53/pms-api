import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomType } from './room-type.entity';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
  ) {}

  async create(propertyId: number, dto: CreateRoomTypeDto) {
    
    const roomType = this.roomTypes.create({
      propertyId,
      name: dto.name,
      description: dto.description
    });
    return this.roomTypes.save(roomType);
  }

  async list(propertyId: number, query: PaginateQuery) {
    return paginate(query, this.roomTypes, {
      sortableColumns: ['name', 'createdAt'],
      searchableColumns: ['name'],
      filterableColumns: {
        name: [FilterOperator.EQ, FilterOperator.ILIKE],
        baseOccupancy: [FilterOperator.GTE, FilterOperator.LTE],
        maxOccupancy: [FilterOperator.GTE, FilterOperator.LTE],
      },
      relations: {
        rooms: true,
        property: true,
      },
      where: { propertyId },
    });
  }

  async getById(propertyId: number, id: number) {
    const roomType = await this.roomTypes.findOne({
      where: { id, propertyId },
      relations: { rooms: true, property: true },
    });
    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }
    return roomType;
  }

  async update(propertyId: number, id: number, dto: UpdateRoomTypeDto) {
    const roomType = await this.getById(propertyId, id);
    const updated = this.roomTypes.merge(roomType, {
      name: dto.name ?? roomType.name,
      description: dto.description ?? roomType.description,
    });
    return this.roomTypes.save(updated);
  }

  async remove(propertyId: number, id: number) {
    const roomType = await this.getById(propertyId, id);
    await this.roomTypes.remove(roomType);
    return { deleted: true };
  }
}
