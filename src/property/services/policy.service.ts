import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { paginate, PaginateQuery, Paginated } from 'nestjs-paginate';
import { Policy } from '../entities/policy.entity';
import { PropertyPolicy } from '../entities/property-policy.entity';
import { Property } from '../entities/property.entity';
import { CreatePolicyDto } from '../dto/policy.dto';
import { POLICY_PAGINATION_CONFIG } from '../config/policy.pagination';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepo: Repository<Policy>,
    @InjectRepository(PropertyPolicy)
    private readonly propertyPolicyRepo: Repository<PropertyPolicy>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
  ) {}

  async create(dto: CreatePolicyDto, ownerId: number): Promise<Policy> {
    const policy = new Policy();
    policy.name = dto.name;
    policy.description = dto.description;
    policy.policyType = dto.policyType;
    policy.ownerId = ownerId;

    return await this.policyRepo.save(policy);
  }

  async paginate(
    query: PaginateQuery,
    ownerId: number,
  ): Promise<Paginated<Policy>> {
    // Ensure we only see our own policies
    if (!query.filter) query.filter = {};
    query.filter.ownerId = `$eq:${ownerId}`;

    return await paginate(query, this.policyRepo, POLICY_PAGINATION_CONFIG);
  }

  async findOne(id: number, ownerId: number): Promise<Policy> {
    const policy = await this.policyRepo.findOne({
      where: { id, ownerId },
    });
    if (!policy) {
      throw new NotFoundException(
        `Policy with ID ${id} not found or access denied`,
      );
    }
    return policy;
  }

  async update(
    id: number,
    dto: CreatePolicyDto,
    ownerId: number,
  ): Promise<Policy> {
    const policy = await this.findOne(id, ownerId);
    policy.name = dto.name;
    policy.description = dto.description;
    policy.policyType = dto.policyType;

    await this.policyRepo.save(policy);
    await this.propertyPolicyRepo.update(
      { policyId: id },
      {
        description: dto.description,
        policyType: dto.policyType,
      },
    );

    return policy;
  }

  async delete(id: number, ownerId: number): Promise<Policy> {
    const policy = await this.findOne(id, ownerId);
    return await this.policyRepo.remove(policy);
  }

  async assignToProperties(
    policyId: number,
    propertyIds: number[],
    ownerId: number,
  ) {
    const policy = await this.findOne(policyId, ownerId);
    const properties = await this.propertyRepo.find({
      where: {
        id: In(propertyIds),
        ownerId,
      },
    });

    if (properties.length !== propertyIds.length) {
      throw new ForbiddenException(
        'One or more selected properties were not found or do not belong to you',
      );
    }

    for (const propertyId of propertyIds) {
      let propertyPolicy = await this.propertyPolicyRepo.findOne({
        where: {
          propertyId,
          policyType: policy.policyType,
        },
      });

      if (propertyPolicy) {
        propertyPolicy.policyId = policy.id;
        propertyPolicy.description = policy.description;
      } else {
        propertyPolicy = this.propertyPolicyRepo.create({
          propertyId,
          policyId: policy.id,
          policyType: policy.policyType,
          description: policy.description,
        });
      }
      await this.propertyPolicyRepo.save(propertyPolicy);
    }

    return { success: true };
  }
}
