export interface RoomOccupancyDto {
  occupiedRooms: number;
  totalRooms: number;
  occupancyRate: number;
}

export interface StatusBreakdownDto {
  hold: number;
  reserved: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  noShow: number;
}

export interface BookingAnalyticsResponseDto {
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  activeBookings: number;
  roomOccupancy: RoomOccupancyDto;
  statusBreakdown: StatusBreakdownDto;
}
