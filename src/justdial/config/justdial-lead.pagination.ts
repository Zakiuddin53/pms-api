import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { JustdialLead } from '../entities/justdial-lead.entity';

export const JUSTDIAL_LEAD_PAGINATION_CONFIG: PaginateConfig<JustdialLead> = {
  sortableColumns: ['id', 'createdAt', 'date', 'name', 'city', 'status'],
  nullSort: 'last',
  defaultSortBy: [['createdAt', 'DESC']],
  searchableColumns: ['name', 'mobile', 'city', 'leadid'],
  filterableColumns: {
    status: [FilterOperator.EQ, FilterOperator.IN],
    city: [FilterOperator.EQ, FilterOperator.ILIKE],
    category: [FilterOperator.EQ, FilterOperator.ILIKE],
    propertyId: [FilterOperator.EQ, FilterOperator.IN],
    'Property.slug': [FilterOperator.EQ],
  },
  relations: {
    Property: true,
  },
};
