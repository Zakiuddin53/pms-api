import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Booking } from './entities/booking.entity';

export const BOOKING_PAGINATION_CONFIG: PaginateConfig<Booking> = {
  sortableColumns: ['bookingCode', 'createdAt'],
  searchableColumns: ['bookingCode', 'createdAt'],
  filterableColumns: {
    bookingCode: [FilterOperator.EQ, FilterOperator.ILIKE],
    createdAt: [FilterOperator.EQ, FilterOperator.ILIKE],
  },
  relations: { Guest: true, Items: true, Payments: true },
};
