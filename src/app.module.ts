import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { PropertyModule } from './property/property.module';
import { ConfigModule } from '@nestjs/config';
import { InventoryModule } from './inventory/inventory.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { JustdialModule } from './justdial/justdial.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { UploadModule } from './upload.module';


@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute window
        limit: 200, // 200 requests per minute
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.ENV_FILE_PATH
        ? [process.env.ENV_FILE_PATH]
        : [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl:
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    }),
    AuthModule,
    BookingsModule,
    PropertyModule,
    InventoryModule,
    PaymentsModule,
    MailModule,
    SuperAdminModule,
    JustdialModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
