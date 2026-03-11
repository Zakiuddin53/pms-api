import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaginateQuery, paginate } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { PropertyRole, UserRole } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/status.enum';
import { User } from '../users/user.entity';
import { UserPropertyRole } from './entities/user-property-role.entity';
import { CreatePropertyAdminDto } from './dto/create-property-admin.dto';
import { CreatePropertyStaffDto } from './dto/create-property-staff.dto';
import { Property } from './entities/property.entity';
import { PropertyContact } from './entities/property-contact.entity';
import { PropertyAbout } from './entities/property-about.entity';
import { PROPERTY_PAGINATION_CONFIG } from './property.pagination';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-propertie.dto';

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

  async create(ownerId: number, dto: CreatePropertyDto) {
    return this.dataSource.transaction(async (manager) => {
      const property = manager.create(Property, {
        name: dto.name,
        address: dto.address,
        pinCode: dto.pinCode,
        propertyType: dto.propertyType,
        city: dto.city,
        state: dto.state,
        rating: dto.rating,
        ownerId,
      });

      const savedProperty = await manager.save(Property, property);

      // Update the existing null-propertyId membership (created at registration)
      const nullMembership = await manager.findOne(UserPropertyRole, {
        where: {
          userId: ownerId,
          propertyId: null as any,
          role: PropertyRole.PROPERTY_ADMIN,
        },
      });

      if (nullMembership) {
        nullMembership.propertyId = savedProperty.id;
        await manager.save(UserPropertyRole, nullMembership);
      } else {
        await manager.save(
          UserPropertyRole,
          manager.create(UserPropertyRole, {
            userId: ownerId,
            propertyId: savedProperty.id,
            role: PropertyRole.PROPERTY_ADMIN,
            isActive: true,
          }),
        );
      }

      if (dto.contact) {
        await manager.save(
          PropertyContact,
          manager.create(PropertyContact, {
            Property: savedProperty,
            propertyId: savedProperty.id,
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
            Property: savedProperty,
            propertyId: savedProperty.id,
            description: dto.about.description,
            checkInTime: dto.about.checkInTime,
            checkOutTime: dto.about.checkOutTime,
          }),
        );
      }

      return manager.findOne(Property, {
        where: { id: savedProperty.id },
        relations: ['Contact', 'PropertyAbout'],
      });
    });
  }

  // Dedicated endpoint for image management. Uploads files to Cloudinary and
  // replaces the property's imageUrls. Rolls back on any upload failure.

  async updateImages(id: number, files: Express.Multer.File[]) {
    const property = await this.properties.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    const uploadedUrls = await this.cloudinaryService.uploadImages(
      files,
      'properties',
    );

    property.imageUrls = uploadedUrls;
    await this.properties.save(property);

    return { imageUrls: property.imageUrls };
  }

  async paginate(query: PaginateQuery) {
    return await paginate(query, this.properties, PROPERTY_PAGINATION_CONFIG);
  }

  async getById(id: number) {
    const property = await this.properties.findOne({
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

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async update(id: number, dto: UpdatePropertyDto) {
    return this.dataSource.transaction(async (manager) => {
      const property = await manager.findOne(Property, {
        where: { id },
        relations: ['Contact', 'PropertyAbout'],
      });

      if (!property) {
        throw new NotFoundException(`Property with ID ${id} not found`);
      }

      const { contact, about, ...propertyFields } = dto;

      Object.keys(propertyFields).forEach((key) => {
        if (propertyFields[key] !== undefined) {
          property[key] = propertyFields[key];
        }
      });

      if (contact !== undefined) {
        if (property.Contact) {
          Object.keys(contact).forEach((key) => {
            if (contact[key] !== undefined) {
              property.Contact[key] = contact[key];
            }
          });
          await manager.save(PropertyContact, property.Contact);
        } else {
          const newContact = manager.create(PropertyContact, {
            ...contact,
            Property: property,
            propertyId: property.id,
          });
          property.Contact = await manager.save(PropertyContact, newContact);
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
          const newAbout = manager.create(PropertyAbout, {
            description: about.description,
            checkInTime: about.checkInTime,
            checkOutTime: about.checkOutTime,
            Property: property,
            propertyId: property.id,
          });
          property.PropertyAbout = await manager.save(PropertyAbout, newAbout);
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
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existingUser)
      throw new BadRequestException('A user with this email already exists');

    const user = await this.users.save(
      this.users.create({
        userRole: UserRole.STAFF,
        name: dto.name,
        email,
        status: UserStatus.PENDING,
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

    const token = this.authService.generateInviteToken(String(user.id));
    await this.mailService.sendStaffInviteEmail(
      email,
      dto.name,
      property.name,
      token,
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      propertyId,
      status: user.status,
    };
  }

  async createStaff(propertyId: number, dto: CreatePropertyStaffDto) {
    const property = await this.properties.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existingUser)
      throw new BadRequestException('A user with this email already exists');

    const user = await this.users.save(
      this.users.create({
        userRole: UserRole.STAFF,
        name: dto.name,
        email,
        status: UserStatus.PENDING,
      }),
    );

    const membership = await this.memberships.save(
      this.memberships.create({
        userId: user.id,
        propertyId,
        role: PropertyRole.PROPERTY_STAFF,
        isActive: true,
      }),
    );

    const token = this.authService.generateInviteToken(String(user.id));
    await this.mailService.sendStaffInviteEmail(
      email,
      dto.name,
      property.name,
      token,
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
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
