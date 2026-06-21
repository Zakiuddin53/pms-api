import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Booking } from './entities/booking.entity';

export const BOOKING_PAGINATION_CONFIG: PaginateConfig<Booking> = {
  sortableColumns: [
    'id',
    'bookingCode',
    'createdAt',
    'checkIn',
    'checkOut',
    'totalAmount',
  ],
  searchableColumns: ['bookingCode', 'Guests.Guest.name', 'Guests.Guest.email'],
  filterableColumns: {
    bookingCode: [FilterOperator.EQ, FilterOperator.ILIKE],
    status: [FilterOperator.EQ],
    source: [FilterOperator.EQ],
    checkIn: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
    checkOut: [FilterOperator.EQ, FilterOperator.GTE, FilterOperator.LTE],
    totalAmount: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.EQ],
    'Property.id': [FilterOperator.EQ],
    propertyId: [FilterOperator.EQ],
    createdAt: [FilterOperator.GTE, FilterOperator.LTE],
  },
  select: [
    'id',
    'bookingCode',
    'source',
    'status',
    'checkIn',
    'checkOut',
    'createdAt',
    'totalAmount',
    'paidAmount',
    'Guests.id',
    'Guests.Guest.id',
    'Guests.Guest.name',
    'Guests.Guest.phone',
    'Guests.isPrimary',
    'Guests.Guest.email',
    'Items.id',
    'Items.RoomType.id',
    'Items.RoomType.name',
    'Items.AssignedRooms.id',
    'Items.AssignedRooms.Room.id',
    'Items.AssignedRooms.Room.roomNumber',
  ],
  relations: {
    Guests: { Guest: true },
    Items: {
      RoomType: true,
      AssignedRooms: {
        Room: true,
      },
    },
  },
  defaultSortBy: [['createdAt', 'DESC']],
};
