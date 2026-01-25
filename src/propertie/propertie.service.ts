import { BadRequestException, Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { PropertyRole } from '../common/enums/property-role.enum';
import { User } from '../users/user.entity';
import { UserPropertyRole } from './entities/user-property-role.entity';
import { CreatePropertieDto } from './dto/create-propertie.dto';
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
  ) {}

  async create(createPropertieDto: CreatePropertieDto) {
    const property = this.properties.create(createPropertieDto);
    return this.properties.save(property);
  }

  async list(query: PaginateQuery) {
    return paginate(query, this.properties, {
      ...propertiesPaginationConfig,
      defaultSortBy: [['name', 'ASC']],
    });
  }

  async createPropertyAdmin(propertyId: number, dto: CreatePropertyAdminDto) {
    const property = await this.properties.findOne({ where: { id: propertyId } });
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
    const property = await this.properties.findOne({ where: { id: propertyId } });
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
      relations: { user: true },
      order: { user: { name: 'ASC' } },
    });

    return memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      propertyId: membership.propertyId,
      isActive: membership.isActive,
    }));
  }
}
