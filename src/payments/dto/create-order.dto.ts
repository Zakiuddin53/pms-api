import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  @ApiProperty({
    description: 'The booking ID to create a Razorpay order for',
    example: 42,
  })
  bookingId: number;
}
