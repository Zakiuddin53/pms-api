import { BadRequestException, Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Propertie } from '../propertie/entities/propertie.entity';
import { User } from '../users/user.entity';
import { UserPropertyRole } from '../user-property-roles/user-property-role.entity';
import { PropertyRole } from '../common/enums/property-role.enum';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Propertie)
    private readonly properties: Repository<Propertie>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
  ) {}

  async createAdmin(dto: CreateAdminDto) {
    const normalizedEmail = dto.email.toLowerCase();
    const property = await this.properties.findOne({
      where: { id: dto.propertyId },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const existing = await this.users.findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.users.create({
      name: dto.name,
      email: normalizedEmail,
      passwordHash,
      status: 'ACTIVE',
    });
    const saved = await this.users.save(user);
    const membership = this.memberships.create({
      userId: saved.id,
      propertyId: dto.propertyId,
      role: PropertyRole.PROPERTY_ADMIN,
      isActive: true,
    });
    await this.memberships.save(membership);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: PropertyRole.PROPERTY_ADMIN,
      isActive: true,
      propertyId: dto.propertyId,
    };
  }
}
