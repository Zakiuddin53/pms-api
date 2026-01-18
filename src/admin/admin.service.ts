import { BadRequestException, Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserPropertyRole } from '../user-property-roles/user-property-role.entity';
import { PropertyRole } from '../common/enums/property-role.enum';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
  ) {}

  async createStaff(propertyId: number, dto: CreateStaffDto) {
    if (!dto.name || !dto.email || !dto.password) {
      throw new BadRequestException('Name, email, and password are required');
    }

    const normalizedEmail = dto.email.toLowerCase();
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
      propertyId,
      role: PropertyRole.STAFF,
      isActive: true,
    });
    await this.memberships.save(membership);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: PropertyRole.STAFF,
      isActive: true,
      propertyId,
    };
  }

  async listStaff(propertyId: number) {
    const memberships = await this.memberships.find({
      where: { propertyId, role: PropertyRole.STAFF, isActive: true },
      relations: { user: true },
      order: { user: { name: 'ASC' } },
    });

    return memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      isActive: membership.isActive,
      propertyId: membership.propertyId,
    }));
  }
}
