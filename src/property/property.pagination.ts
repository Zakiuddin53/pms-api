import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Property } from './entities/property.entity';

export const PROPERTY_PAGINATION_CONFIG: PaginateConfig<Property> = {
  sortableColumns: ['name', 'createdAt', 'address', 'pinCode'],
  searchableColumns: ['name', 'address', 'pinCode'],
  filterableColumns: {
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    address: [FilterOperator.EQ, FilterOperator.ILIKE],
    pinCode: [FilterOperator.EQ, FilterOperator.ILIKE],
  },
  relations: {
    RoomTypes: { Rates: true },
    Contact: true,
    PropertyAbout: true,
  },
};
