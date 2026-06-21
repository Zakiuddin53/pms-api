import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Policy } from '../entities/policy.entity';

export const POLICY_PAGINATION_CONFIG: PaginateConfig<Policy> = {
  sortableColumns: ['name', 'createdAt', 'policyType'],
  searchableColumns: ['name', 'description'],
  defaultSortBy: [['createdAt', 'DESC']],
  filterableColumns: {
    id: [FilterOperator.EQ],
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    policyType: [FilterOperator.EQ, FilterOperator.IN],
    ownerId: [FilterOperator.EQ],
  },
};
