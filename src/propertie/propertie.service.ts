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
import { PropertyContact } from './entities/property-contact.entity';
import { PropertyAbout } from './entities/property-about.entity';
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
    @InjectRepository(PropertyContact)
    private readonly propertyContacts: Repository<PropertyContact>,
    @InjectRepository(PropertyAbout)
    private readonly propertyAbouts: Repository<PropertyAbout>,
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
      state: createPropertieDto.state,
      imageUrls: uploadedImageUrls ?? createPropertieDto.imageUrls ?? null,
      rating: createPropertieDto.rating ?? 0,
    });

    try {
      const savedProperty = await this.properties.save(property);
      if (createPropertieDto.contact) {
        const contact = this.propertyContacts.create({
          Property: savedProperty,
          phone: createPropertieDto.contact.phone,
          whatsapp: createPropertieDto.contact.whatsapp,
          email: createPropertieDto.contact.email,
          googleMapUrl: createPropertieDto.contact.googleMapUrl,
        });
        await this.propertyContacts.save(contact);
      }

      if (createPropertieDto.about) {
        const about = this.propertyAbouts.create({
          Property: savedProperty,
          about: createPropertieDto.about.about,
          policies: createPropertieDto.about.policies,
        });
        await this.propertyAbouts.save(about);
      }

      return await this.properties.findOne({
        where: { id: savedProperty.id },
        relations: ['Contact', 'PropertyAbout'],
      });
    } catch (error) {
      throw new BadRequestException(
        'Failed to create property: ' + error.message,
      );
    }
  }

  async list(query: PaginateQuery) {
    return paginate(query, this.properties, {
      ...propertiesPaginationConfig,
      defaultSortBy: [['name', 'ASC']],
      relations: ['Contact', 'PropertyAbout'],
    });
  }

  async getById(id: number) {
    return await this.properties.findOneOrFail({
      where: { id },
      relations: {
        RoomTypes: {
          Rates: true,
        },
        Contact: true,
        PropertyAbout: true,
      },
    });
  }

  async update(
    id: number,
    updatePropertieDto: UpdatePropertieDto,
    files?: Express.Multer.File[],
  ) {
    let uploadedImageUrls: string[] = [];

    if (files && files.length > 0) {
      uploadedImageUrls = await this.cloudinaryService.uploadImages(
        files,
        'properties',
      );
    }

    const updatedProperty = await this.properties.manager.transaction(
      async (manager) => {
        const property = await manager.findOne(Propertie, {
          where: { id },
          relations: ['Contact', 'PropertyAbout'],
        });

        if (!property) {
          throw new NotFoundException(`Property with ID ${id} not found`);
        }

        const { contact, about, imageUrls, ...propertyFields } =
          updatePropertieDto;

        Object.keys(propertyFields).forEach((key) => {
          if (propertyFields[key] !== undefined) {
            property[key] = propertyFields[key];
          }
        });

        if (uploadedImageUrls.length > 0) {
          property.imageUrls = uploadedImageUrls;
        } else if (imageUrls !== undefined) {
          property.imageUrls = imageUrls;
        }

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
            });
            property.Contact = await manager.save(PropertyContact, newContact);
          }
        }

        if (about !== undefined) {
          if (property.PropertyAbout) {
            Object.keys(about).forEach((key) => {
              if (about[key] !== undefined) {
                property.PropertyAbout[key] = about[key];
              }
            });
            await manager.save(PropertyAbout, property.PropertyAbout);
          } else {
            const newAbout = manager.create(PropertyAbout, {
              ...about,
              Property: property,
            });
            property.PropertyAbout = await manager.save(
              PropertyAbout,
              newAbout,
            );
          }
        }

        const savedProperty = await manager.save(Propertie, property);

        return manager.findOne(Propertie, {
          where: { id: savedProperty.id },
          relations: ['Contact', 'PropertyAbout'],
        });
      },
    );

    return updatedProperty;
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
