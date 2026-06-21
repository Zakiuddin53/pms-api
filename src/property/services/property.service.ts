import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { MailService } from '../../mail/mail.service';
import { AuthService } from '../../auth/auth.service';
import { PropertyRole, UserRole } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/status.enum';
import { User } from '../../users/user.entity';
import { UserPropertyRole } from '../entities/user-property-role.entity';
import { CreatePropertyAdminDto } from '../dto/create-property-admin.dto';
import { Property } from '../entities/property.entity';
import { PropertyContact } from '../entities/property-contact.entity';
import { PropertyAbout } from '../entities/property-about.entity';
import { PROPERTY_PAGINATION_CONFIG } from '../config/property.pagination';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-propertie.dto';
import { UpdatePropertyUserDto } from '../dto/update-property-user.dto';
import { ResetPropertyUserPasswordDto } from '../dto/reset-property-user-password.dto';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  private toSlug(name: string): string {
    return (
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-') || 'property'
    );
  }

  private async generateUniqueSlug(
    manager: EntityManager,
    name: string,
    excludePropertyId?: number,
  ): Promise<string> {
    const baseSlug = this.toSlug(name);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const exists = await manager.findOne(Property, {
        where: excludePropertyId
          ? { slug, id: Not(excludePropertyId) }
          : { slug },
        select: { id: true },
      });
      if (!exists) return slug;
      slug = `${baseSlug}-${suffix++}`;
    }
  }

  private assertManageablePropertyAdmin(
    membership: UserPropertyRole,
    user?: User,
  ) {
    if (
      membership.role !== PropertyRole.PROPERTY_ADMIN ||
      user?.role !== PropertyRole.PROPERTY_ADMIN
    ) {
      throw new ForbiddenException('Only property admins can be managed here');
    }
  }

  async create(ownerId: number, dto: CreatePropertyDto) {
    const property = await this.dataSource.transaction(async (manager) => {
      const slug = await this.generateUniqueSlug(manager, dto.name);
      const property = manager.create(Property, {
        name: dto.name,
        slug,
        address: dto.address,
        pinCode: dto.pinCode,
        propertyType: dto.propertyType,
        city: dto.city,
        state: dto.state,
        totalRooms: dto.totalRooms ?? 0,
        ownerId,
      });

      const saved = await manager.save(Property, property);

      // Bind the null-propertyId membership that was created at registration,
      // or create a fresh one if none exists.
      const nullMembership = await manager.findOne(UserPropertyRole, {
        where: {
          userId: ownerId,
          propertyId: null as any,
          role: PropertyRole.PROPERTY_ADMIN,
        },
      });

      if (nullMembership) {
        nullMembership.propertyId = saved.id;
        await manager.save(UserPropertyRole, nullMembership);
      } else {
        await manager.save(
          UserPropertyRole,
          manager.create(UserPropertyRole, {
            userId: ownerId,
            propertyId: saved.id,
            role: PropertyRole.PROPERTY_ADMIN,
            isActive: true,
          }),
        );
      }

      if (dto.contact) {
        await manager.save(
          PropertyContact,
          manager.create(PropertyContact, {
            Property: saved,
            propertyId: saved.id,
            phone: dto.contact.phone,
            whatsapp: dto.contact.whatsapp,
            email: dto.contact.email,
            googleMapUrl: dto.contact.googleMapUrl,
          }),
        );
      }

      if (dto.about) {
        await manager.save(
          PropertyAbout,
          manager.create(PropertyAbout, {
            Property: saved,
            propertyId: saved.id,
            description: dto.about.description,
            checkInTime: dto.about.checkInTime,
            checkOutTime: dto.about.checkOutTime,
          }),
        );
      }

      return manager.findOne(Property, {
        where: { id: saved.id },
        relations: ['Contact', 'PropertyAbout'],
      });
    });

    const accessToken = await this.authService.issueAccessTokenForUser(ownerId);
    return { property, accessToken };
  }

  async findMine(userId: number, role: PropertyRole) {
    if (role === PropertyRole.SUPER_ADMIN) {
      return this.properties.find({
        order: { createdAt: 'DESC' },
        relations: ['Contact', 'PropertyAbout'],
      });
    }

    return this.properties.find({
      where: [{ UserRole: { userId, isActive: true } }, { ownerId: userId }],
      order: { createdAt: 'DESC' },
      relations: ['Contact', 'PropertyAbout'],
    });
  }

  async paginate(query: PaginateQuery) {
    return paginate(query, this.properties, PROPERTY_PAGINATION_CONFIG);
  }

  /** GET /property/:propertyId */
  async getById(id: number) {
    try {
      return await this.properties.findOneOrFail({
        where: { id },
        relations: [
          'RoomTypes',
          'RoomTypes.Rates',
          'RoomTypes.Amenities',
          'RoomTypes.Amenities.Amenity',
          'Contact',
          'PropertyAbout',
          'Policies',
        ],
      });
    } catch {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
  }

  async updateImages(id: number, files: Express.Multer.File[]) {
    let property: Property;
    try {
      property = await this.properties.findOneOrFail({ where: { id } });
    } catch {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    property.imageUrls = await this.cloudinaryService.uploadImages(
      files,
      'properties',
    );
    await this.properties.save(property);

    return { imageUrls: property.imageUrls };
  }

  async update(id: number, dto: UpdatePropertyDto) {
    return this.dataSource.transaction(async (manager) => {
      let property: Property;
      try {
        property = await manager.findOneOrFail(Property, {
          where: { id },
          relations: ['Contact', 'PropertyAbout'],
        });
      } catch {
        throw new NotFoundException(`Property with ID ${id} not found`);
      }

      const previousName = property.name;
      const { contact, about, ...propertyFields } = dto;
      delete propertyFields.slug;

      for (const key of Object.keys(propertyFields)) {
        if (propertyFields[key] !== undefined)
          property[key] = propertyFields[key];
      }

      if (dto.name !== undefined && dto.name !== previousName) {
        property.slug = await this.generateUniqueSlug(manager, dto.name, id);
      }

      if (contact !== undefined) {
        if (property.Contact) {
          for (const key of Object.keys(contact)) {
            if (contact[key] !== undefined)
              property.Contact[key] = contact[key];
          }
          await manager.save(PropertyContact, property.Contact);
        } else {
          property.Contact = await manager.save(
            PropertyContact,
            manager.create(PropertyContact, {
              ...contact,
              Property: property,
              propertyId: property.id,
            }),
          );
        }
      }

      if (about !== undefined) {
        if (property.PropertyAbout) {
          if (about.description !== undefined)
            property.PropertyAbout.description = about.description;
          if (about.checkInTime !== undefined)
            property.PropertyAbout.checkInTime = about.checkInTime;
          if (about.checkOutTime !== undefined)
            property.PropertyAbout.checkOutTime = about.checkOutTime;
          await manager.save(PropertyAbout, property.PropertyAbout);
        } else {
          property.PropertyAbout = await manager.save(
            PropertyAbout,
            manager.create(PropertyAbout, {
              ...about,
              Property: property,
              propertyId: property.id,
            }),
          );
        }
      }

      const saved = await manager.save(Property, property);
      return manager.findOne(Property, {
        where: { id: saved.id },
        relations: ['Contact', 'PropertyAbout'],
      });
    });
  }

  async createPropertyAdmin(propertyId: number, dto: CreatePropertyAdminDto) {
    let property: Property;
    try {
      property = await this.properties.findOneOrFail({
        where: { id: propertyId },
      });
    } catch {
      throw new NotFoundException('Property not found');
    }

    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = dto.password
      ? await argon2.hash(dto.password)
      : undefined;

    const user = await this.users.save(
      this.users.create({
        userRole: UserRole.STAFF,
        role: PropertyRole.PROPERTY_ADMIN,
        name: dto.name,
        email,
        phone: dto.phone?.trim() || undefined,
        passwordHash,
        permissions: dto.permissions ?? [],
        status: dto.password ? UserStatus.ACTIVE : UserStatus.PENDING,
      }),
    );

    const membership = await this.memberships.save(
      this.memberships.create({
        userId: user.id,
        propertyId,
        role: PropertyRole.PROPERTY_ADMIN,
        isActive: true,
      }),
    );

    if (!dto.password) {
      const token = this.authService.generateInviteToken(String(user.id));
      await this.mailService.sendStaffInviteEmail(
        email,
        dto.name,
        property.name,
        token,
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      permissions: user.permissions,
      propertyId,
      status: user.status,
    };
  }

  async listPropertyUsers(propertyId: number) {
    const memberships = await this.memberships.find({
      where: { propertyId, isActive: true },
      relations: { User: true },
      order: { User: { name: 'ASC' } },
    });

    return (
      memberships
        // Exclude SUPER_ADMIN accounts — they are not managed here
        .filter(
          (m) =>
            m.role === PropertyRole.PROPERTY_ADMIN &&
            m.User.role === PropertyRole.PROPERTY_ADMIN,
        )
        .map((m) => ({
          id: m.User.id,
          name: m.User.name,
          email: m.User.email,
          role: m.role,
          permissions: m.User.permissions ?? [],
          propertyId: m.propertyId,
          isActive: m.isActive,
        }))
    );
  }

  async updatePropertyUser(
    propertyId: number,
    userId: number,
    dto: UpdatePropertyUserDto,
  ) {
    let membership: UserPropertyRole;
    try {
      membership = await this.memberships.findOneOrFail({
        where: { propertyId, userId },
        relations: { User: true },
      });
    } catch {
      throw new NotFoundException('User membership not found');
    }

    const user = membership.User;
    this.assertManageablePropertyAdmin(membership, user);

    if (dto.isActive !== undefined) {
      membership.isActive = dto.isActive;
      await this.memberships.save(membership);

      if (user) {
        if (dto.isActive) {
          if (user.status !== UserStatus.ACTIVE) {
            user.status = UserStatus.ACTIVE;
            await this.users.save(user);
          }
        } else {
          const hasOtherActive = await this.memberships.exists({
            where: { userId, isActive: true, id: Not(membership.id) },
          });
          if (!hasOtherActive && user.status === UserStatus.ACTIVE) {
            user.status = UserStatus.INACTIVE;
            await this.users.save(user);
          }
        }
      }
    }

    // Super Admin can update the admin's permission set at any time
    if (dto.permissions !== undefined && user) {
      user.permissions = dto.permissions;
      await this.users.save(user);
    }

    return {
      updated: true,
      isActive: membership.isActive,
      permissions: user?.permissions ?? [],
      status: user?.status,
    };
  }

  async resetPropertyUserPassword(
    propertyId: number,
    userId: number,
    dto: ResetPropertyUserPasswordDto,
  ) {
    let membership: UserPropertyRole;
    try {
      membership = await this.memberships.findOneOrFail({
        where: { propertyId, userId },
        relations: { User: true },
      });
    } catch {
      throw new NotFoundException('User membership not found');
    }

    const user = membership.User;
    if (!user) throw new NotFoundException('User not found');
    this.assertManageablePropertyAdmin(membership, user);

    user.passwordHash = await argon2.hash(dto.password);
    user.status = UserStatus.ACTIVE;
    await this.users.save(user);

    if (!membership.isActive) {
      membership.isActive = true;
      await this.memberships.save(membership);
    }

    return { message: 'Password reset successfully' };
  }
}
