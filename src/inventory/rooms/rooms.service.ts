import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { RoomStatus } from '../../common/enums/room-status.enum';
import { RoomType } from '../room-types/entity/room-type.entity';
import { Property } from '@/property/entities/property.entity';
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
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
  ) {}

  async create(propertyId: number, dto: CreateRoomDto) {
    const roomType = await this.roomTypes.findOne({
      where: { id: dto.roomTypeId, propertyId },
    });
    if (!roomType) {
      throw new BadRequestException('Room type not found for property');
    }

    await this.assertRoomNumberAvailable(propertyId, dto.roomNumber);

    const room = this.rooms.create({
      propertyId,
      roomTypeId: dto.roomTypeId,
      roomNumber: dto.roomNumber.trim(),
      status: dto.status ?? RoomStatus.ACTIVE,
    });
    const saved = await this.rooms.save(room);
    await this.syncPropertyRoomCount(propertyId);
    return saved;
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
      relations: { roomType: true },
    });
  }

  async getById(propertyId: number, id: number) {
    const room = await this.rooms.findOne({
      where: { id, propertyId },
      relations: { roomType: true },
    });
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

    if (dto.roomNumber && dto.roomNumber !== room.roomNumber) {
      await this.assertRoomNumberAvailable(propertyId, dto.roomNumber, id);
    }

    const updated = this.rooms.merge(room, {
      roomNumber: dto.roomNumber?.trim() ?? room.roomNumber,
      status: dto.status ?? room.status,
      roomTypeId: dto.roomTypeId ?? room.roomTypeId,
    });
    return this.rooms.save(updated);
  }

  async remove(propertyId: number, id: number) {
    const room = await this.getById(propertyId, id);
    await this.rooms.remove(room);
    await this.syncPropertyRoomCount(propertyId);
    return { deleted: true };
  }

  private async assertRoomNumberAvailable(
    propertyId: number,
    roomNumber: string,
    roomIdToIgnore?: number,
  ) {
    const normalized = roomNumber.trim();
    if (!normalized) {
      throw new BadRequestException('Room number is required');
    }

    const duplicate = await this.rooms.findOne({
      where: { propertyId, roomNumber: normalized },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== roomIdToIgnore) {
      throw new BadRequestException(
        `Room number ${normalized} already exists for this property`,
      );
    }
  }

  private async syncPropertyRoomCount(propertyId: number) {
    const totalRooms = await this.rooms.count({ where: { propertyId } });
    await this.properties.update({ id: propertyId }, { totalRooms });
  }
}
