import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { Room } from '../rooms/room.entity';
import { RoomType } from '../room-types/room-type.entity';
import { CreateRoomBlockDto } from './dto/create-room-block.dto';
import { UpdateRoomBlockDto } from './dto/update-room-block.dto';
import { RoomBlock } from './room-block.entity';

@Injectable()
export class RoomBlocksService {
  constructor(
    @InjectRepository(RoomBlock)
    private readonly roomBlocks: Repository<RoomBlock>,
    @InjectRepository(Room)
    private readonly rooms: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
  ) {}

  async create(propertyId: number, dto: CreateRoomBlockDto) {
    if (!dto.roomId && !dto.roomTypeId) {
      throw new BadRequestException('Either roomId or roomTypeId is required');
    }

    if (dto.roomId) {
      const room = await this.rooms.findOne({
        where: { id: dto.roomId, propertyId },
      });
      if (!room) {
        throw new BadRequestException('Room not found for property');
      }
    }

    if (dto.roomTypeId) {
      const roomType = await this.roomTypes.findOne({
        where: { id: dto.roomTypeId, propertyId },
      });
      if (!roomType) {
        throw new BadRequestException('Room type not found for property');
      }
    }

    const block = this.roomBlocks.create({
      propertyId,
      roomId: dto.roomId ?? null,
      roomTypeId: dto.roomTypeId ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason ?? null,
    });
    return this.roomBlocks.save(block);
  }

  async list(propertyId: number, query: PaginateQuery) {
    return paginate(query, this.roomBlocks, {
      sortableColumns: ['startDate', 'endDate', 'roomId', 'roomTypeId'],
      filterableColumns: {
        roomId: [FilterOperator.EQ],
        roomTypeId: [FilterOperator.EQ],
        startDate: [FilterOperator.GTE, FilterOperator.LTE],
        endDate: [FilterOperator.GTE, FilterOperator.LTE],
      },
      where: { propertyId },
    });
  }

  async getById(propertyId: number, id: number) {
    const block = await this.roomBlocks.findOne({ where: { id, propertyId } });
    if (!block) {
      throw new NotFoundException('Room block not found');
    }
    return block;
  }

  async update(propertyId: number, id: number, dto: UpdateRoomBlockDto) {
    const block = await this.getById(propertyId, id);

    if (dto.roomId || dto.roomTypeId) {
      if (!dto.roomId && !dto.roomTypeId && !block.roomId && !block.roomTypeId) {
        throw new BadRequestException('Either roomId or roomTypeId is required');
      }

      if (dto.roomId) {
        const room = await this.rooms.findOne({
          where: { id: dto.roomId, propertyId },
        });
        if (!room) {
          throw new BadRequestException('Room not found for property');
        }
      }

      if (dto.roomTypeId) {
        const roomType = await this.roomTypes.findOne({
          where: { id: dto.roomTypeId, propertyId },
        });
        if (!roomType) {
          throw new BadRequestException('Room type not found for property');
        }
      }
    }

    const updated = this.roomBlocks.merge(block, {
      roomId: dto.roomId ?? block.roomId,
      roomTypeId: dto.roomTypeId ?? block.roomTypeId,
      startDate: dto.startDate ?? block.startDate,
      endDate: dto.endDate ?? block.endDate,
      reason: dto.reason ?? block.reason,
    });
    return this.roomBlocks.save(updated);
  }

  async remove(propertyId: number, id: number) {
    const block = await this.getById(propertyId, id);
    await this.roomBlocks.remove(block);
    return { deleted: true };
  }
}
