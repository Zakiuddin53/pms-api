import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { RoomType } from '../room-types/room-type.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
  ) {}

  async create(propertyId: number, dto: CreateRoomDto) {
    const roomType = await this.roomTypes.findOne({
      where: { id: dto.roomTypeId, propertyId },
    });
    if (!roomType) {
      throw new BadRequestException('Room type not found for property');
    }

    const room = this.rooms.create({
      propertyId,
      roomTypeId: dto.roomTypeId,
      roomNumber: dto.roomNumber,
      status: dto.status ?? RoomStatus.ACTIVE,
    });
    return this.rooms.save(room);
  }

  async list(propertyId: number, query: PaginateQuery) {
    return paginate(query, this.rooms, {
      sortableColumns: ['roomNumber', 'status'],
      searchableColumns: ['roomNumber'],
      filterableColumns: {
        roomTypeId: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
        roomNumber: [FilterOperator.ILIKE],
      },
      where: { propertyId },
    });
  }

  async getById(propertyId: number, id: number) {
    const room = await this.rooms.findOne({ where: { id, propertyId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async update(propertyId: number, id: number, dto: UpdateRoomDto) {
    const room = await this.getById(propertyId, id);

    if (dto.roomTypeId) {
      const roomType = await this.roomTypes.findOne({
        where: { id: dto.roomTypeId, propertyId },
      });
      if (!roomType) {
        throw new BadRequestException('Room type not found for property');
      }
    }

    const updated = this.rooms.merge(room, {
      roomNumber: dto.roomNumber ?? room.roomNumber,
      status: dto.status ?? room.status,
    });
    return this.rooms.save(updated);
  }

  async remove(propertyId: number, id: number) {
    const room = await this.getById(propertyId, id);
    await this.rooms.remove(room);
    return { deleted: true };
  }
}
