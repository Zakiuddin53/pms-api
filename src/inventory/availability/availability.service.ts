import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { RoomAvailability } from './room-availability.entity';
import { AvailabilityRangeQueryDto } from './dto/availability-query.dto';

export interface AvailabilityRow {
  date: string;
  roomTypeId: number;
  totalRooms: number;
  blockedRooms: number;
  bookedRooms: number;
  availableRooms: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(RoomAvailability)
    private readonly availability: Repository<RoomAvailability>,
  ) {}

  /**
   * Returns per-day availability snapshots for a property.
   * The `availableRooms` field is derived on the fly:
   *   availableRooms = totalRooms - blockedRooms - bookedRooms
   */
  async getAvailability(
    propertyId: number,
    query: AvailabilityRangeQueryDto,
  ): Promise<AvailabilityRow[]> {
    const { startDate, endDate, roomTypeId } = query;

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const where: Record<string, any> = {
      propertyId,
      date: Between(startDate, endDate),
    };
    if (roomTypeId) {
      where.roomTypeId = roomTypeId;
    }

    const rows = await this.availability.find({
      where,
      relations: { RoomType: true },
      order: { date: 'ASC', roomTypeId: 'ASC' },
    });

    return rows.map((row) => ({
      date: row.date,
      roomTypeId: row.roomTypeId,
      roomTypeName: row.RoomType?.name ?? null,
      totalRooms: row.totalRooms,
      blockedRooms: row.blockedRooms,
      bookedRooms: row.bookedRooms,
      availableRooms: Math.max(
        0,
        row.totalRooms - row.blockedRooms - row.bookedRooms,
      ),
    })) as AvailabilityRow[];
  }

  /**
   * Upsert a single-day availability snapshot.
   * Called internally by other services (e.g. when a room is added/removed,
   * or when the room-block service writes a new block).
   * Uses an INSERT … ON CONFLICT DO UPDATE pattern via TypeORM's upsert.
   */
  async upsert(data: {
    propertyId: number;
    roomTypeId: number;
    date: string;
    totalRooms?: number;
    blockedRooms?: number;
    bookedRooms?: number;
  }): Promise<void> {
    await this.availability
      .createQueryBuilder()
      .insert()
      .into(RoomAvailability)
      .values({
        propertyId: data.propertyId,
        roomTypeId: data.roomTypeId,
        date: data.date,
        totalRooms: data.totalRooms ?? 0,
        blockedRooms: data.blockedRooms ?? 0,
        bookedRooms: data.bookedRooms ?? 0,
      })
      .orUpdate(
        ['totalRooms', 'blockedRooms', 'bookedRooms'],
        ['roomTypeId', 'date'],
      )
      .execute();
  }

  /**
   * Bulk-upsert a date range for a given room type.
   * Handy when total room count changes (e.g. a room is added or deleted).
   */
  async upsertDateRange(
    propertyId: number,
    roomTypeId: number,
    startDate: string,
    endDate: string,
    delta: { totalRooms?: number; blockedRooms?: number; bookedRooms?: number },
  ): Promise<void> {
    const dates = this.expandDateRange(startDate, endDate);
    for (const date of dates) {
      await this.upsert({ propertyId, roomTypeId, date, ...delta });
    }
  }

  // ─── private helpers ────────────────────────────────────────────────────────

  private expandDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const cursor = new Date(start);
    const endDate = new Date(end);

    while (cursor <= endDate) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }
}
