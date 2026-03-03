import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, IsNotEmpty } from 'class-validator';

export class VerifyPaymentDto {
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 42 })
  bookingId: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'order_EKwxwAgItmmXdp' })
  razorpayOrderId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'pay_29QQoUBi66xm2f' })
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '9ef4dffbfd84f1318f6739a3ce19f9d85851857...' })
  razorpaySignature: string;
}
