import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { User } from '@/users/user.entity';
import { UserStatus } from '@/common/enums/status.enum';
import { PropertyRole, UserRole } from '@/common/enums/role.enum';
import { UserPropertyRole } from '@/property/entities/user-property-role.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
  ) {}

  async listOwnerRequests() {
    const inactiveAdmins = await this.users.find({
      where: { userRole: UserRole.STAFF, status: UserStatus.INACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (inactiveAdmins.length === 0) return [];

    const adminIds = inactiveAdmins.map((u) => u.id);
    const eligibleMemberships = await this.memberships.find({
      where: {
        userId: In(adminIds),
        propertyId: IsNull(),
        role: PropertyRole.PROPERTY_ADMIN,
        isActive: true,
      },
    });

    const eligibleUserIds = new Set(eligibleMemberships.map((m) => m.userId));

    return inactiveAdmins
      .filter((u) => eligibleUserIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        createdAt: u.createdAt,
      }));
  }

  async activateUser(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.status = UserStatus.ACTIVE;
    await this.users.save(user);
    return { message: 'User activated' };
  }
}
