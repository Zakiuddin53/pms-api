import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { PropertyRole } from '../common/enums/property-role.enum';
import { User } from '../users/user.entity';
import { UserPropertyRole } from './entities/user-property-role.entity';
import { CreatePropertieDto } from './dto/create-propertie.dto';
import { UpdatePropertieDto } from './dto/update-propertie.dto';
import { CreatePropertyAdminDto } from './dto/create-property-admin.dto';
import { CreatePropertyStaffDto } from './dto/create-property-staff.dto';
import { Propertie } from './entities/propertie.entity';
import { propertiesPaginationConfig } from './propertie.pagination';

@Injectable()
export class PropertieService {
  constructor(
    @InjectRepository(Propertie)
    private readonly properties: Repository<Propertie>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createPropertieDto: CreatePropertieDto,
    files?: Express.Multer.File[],
  ) {
    let uploadedImageUrls: string[] | null = null;
    if (files && files.length > 0) {
      try {
        uploadedImageUrls = await this.cloudinaryService.uploadImages(
          files,
          'properties',
        );
      } catch {
        throw new BadRequestException('Failed to upload property images');
      }
    }

    const property = this.properties.create({
      name: createPropertieDto.name,
      address: createPropertieDto.address,
      pinCode: createPropertieDto.pinCode,
      city: createPropertieDto.city,
      description: createPropertieDto.description,
      state: createPropertieDto.state,
      imageUrls: uploadedImageUrls ?? createPropertieDto.imageUrls ?? null,
      rating: createPropertieDto.rating ?? 0,
    });

    try {
      return await this.properties.save(property);
    } catch {
      throw new BadRequestException('Failed to create property');
    }
  }

  async list(query: PaginateQuery) {
    return paginate(query, this.properties, {
      ...propertiesPaginationConfig,
      defaultSortBy: [['name', 'ASC']],
    });
  }

  async getById(id: number) {
    return await this.properties.findOneOrFail({
      where: { id },
      relations: {
        RoomTypes: {
          Rates: true,
        },
      },
    });
  }

  async update(
    id: number,
    updatePropertieDto: UpdatePropertieDto,
    files?: Express.Multer.File[],
  ) {
    const property = await this.properties.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    let uploadedImageUrls: string[] | null = null;
    if (files && files.length > 0) {
      try {
        uploadedImageUrls = await this.cloudinaryService.uploadImages(
          files,
          'properties',
        );
      } catch {
        throw new BadRequestException('Failed to upload property images');
      }
    }

    if (updatePropertieDto.name !== undefined) {
      property.name = updatePropertieDto.name;
    }
    if (updatePropertieDto.address !== undefined) {
      property.address = updatePropertieDto.address;
    }
    if (updatePropertieDto.pinCode !== undefined) {
      property.pinCode = updatePropertieDto.pinCode;
    }
    if (updatePropertieDto.city !== undefined) {
      property.city = updatePropertieDto.city;
    }
    if (updatePropertieDto.description !== undefined) {
      property.description = updatePropertieDto.description;
    }
    if (updatePropertieDto.state !== undefined) {
      property.state = updatePropertieDto.state;
    }
    if (uploadedImageUrls) {
      property.imageUrls = uploadedImageUrls;
    } else if (updatePropertieDto.imageUrls !== undefined) {
      property.imageUrls = updatePropertieDto.imageUrls;
    }
    if (updatePropertieDto.rating !== undefined) {
      property.rating = updatePropertieDto.rating;
    }
    return await this.properties.save(property);
  }

  async createPropertyAdmin(propertyId: number, dto: CreatePropertyAdminDto) {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.users.create({
      name: dto.name,
      email,
      passwordHash,
      status: 'ACTIVE',
    });
    const saved = await this.users.save(user);

    const membership = this.memberships.create({
      userId: saved.id,
      propertyId,
      role: PropertyRole.PROPERTY_ADMIN,
      isActive: true,
    });
    await this.memberships.save(membership);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: membership.role,
      propertyId,
      isActive: membership.isActive,
    };
  }

  async createStaff(propertyId: number, dto: CreatePropertyStaffDto) {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.users.create({
      name: dto.name,
      email,
      passwordHash,
      status: 'ACTIVE',
    });
    const saved = await this.users.save(user);

    const membership = this.memberships.create({
      userId: saved.id,
      propertyId,
      role: PropertyRole.STAFF,
      isActive: true,
    });
    await this.memberships.save(membership);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: membership.role,
      propertyId,
      isActive: membership.isActive,
    };
  }

  async listPropertyUsers(propertyId: number) {
    const memberships = await this.memberships.find({
      where: { propertyId, isActive: true },
      relations: { User: true },
      order: { User: { name: 'ASC' } },
    });

    return memberships.map((membership) => ({
      id: membership.User.id,
      name: membership.User.name,
      email: membership.User.email,
      role: membership.role,
      propertyId: membership.propertyId,
      isActive: membership.isActive,
    }));
  }
}
