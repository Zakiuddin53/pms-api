import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Property } from '../entities/property.entity';

export const PROPERTY_PAGINATION_CONFIG: PaginateConfig<Property> = {
  sortableColumns: ['name', 'createdAt', 'address', 'pinCode'],
  searchableColumns: ['name', 'address', 'pinCode'],
  filterableColumns: {
    id: [FilterOperator.EQ, FilterOperator.ILIKE],
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    address: [FilterOperator.EQ, FilterOperator.ILIKE],
    pinCode: [FilterOperator.EQ, FilterOperator.ILIKE],
    'Owner.id': [FilterOperator.EQ, FilterOperator.IN],
    propertyType: [FilterOperator.EQ, FilterOperator.IN],
  },
  relations: {
    RoomTypes: { Rates: true, Amenities: true },
    Contact: true,
    PropertyAbout: true,
    Owner: true,
    Policies: true,
  },
};
