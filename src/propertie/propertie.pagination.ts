import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Propertie } from './entities/propertie.entity';

export const propertiesPaginationConfig: PaginateConfig<Propertie> = {
  sortableColumns: ['name', 'createdAt', 'address', 'pinCode'],
  searchableColumns: ['name', 'address', 'pinCode'],
  filterableColumns: {
    name: [FilterOperator.EQ, FilterOperator.ILIKE],
    address: [FilterOperator.EQ, FilterOperator.ILIKE],
    pinCode: [FilterOperator.EQ, FilterOperator.ILIKE],
  },
  relations: {
    roomTypes: true,
  },
};
