import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomType } from './room-type.entity';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypes: Repository<RoomType>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    propertyId: number,
    dto: CreateRoomTypeDto,
    files?: Express.Multer.File[],
  ) {
    const imageUrls =
      files && files.length > 0
        ? await this.cloudinaryService.uploadImages(files, 'room-types')
        : dto.imageUrls;

    const roomType = this.roomTypes.create({
      propertyId,
      name: dto.name,
      description: dto.description,
      capacity: dto.capacity,
      amenities: dto.amenities,
      imageUrls,
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
        Rooms: true,
        Property: true,
      },
      where: { propertyId },
    });
  }

  async getById(propertyId: number, id: number) {
    const roomType = await this.roomTypes.findOne({
      where: { id, propertyId },
      relations: { Rooms: true, Property: true },
    });
    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }
    return roomType;
  }

  async update(
    propertyId: number,
    id: number,
    dto: UpdateRoomTypeDto,
    files?: Express.Multer.File[],
  ) {
    const roomType = await this.getById(propertyId, id);
    const imageUrls =
      files && files.length > 0
        ? await this.cloudinaryService.uploadImages(files, 'room-types')
        : (dto.imageUrls ?? roomType.imageUrls);

    const updated = this.roomTypes.merge(roomType, {
      name: dto.name ?? roomType.name,
      description: dto.description ?? roomType.description,
      capacity: dto.capacity ?? roomType.capacity,
      amenities: dto.amenities ?? roomType.amenities,
      imageUrls,
    });
    return this.roomTypes.save(updated);
  }

  async remove(propertyId: number, id: number) {
    const roomType = await this.getById(propertyId, id);
    await this.roomTypes.remove(roomType);
    return { deleted: true };
  }
}
