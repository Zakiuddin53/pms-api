/// PMS API
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';

if (!(global as any).crypto) {
  (global as any).crypto = webcrypto;
}
const allowedOrigins = [
  'https://arooba-pms.vercel.app',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4000',
  'https://backendinvestigate360.agency',
];
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: (origin, callback) => {
      // In development, sometimes origin is undefined (e.g. from local docs or same-port requests)
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        // Clean both origin and allowedOrigin for comparison (remove trailing slashes)
        const cleanOrigin = origin.replace(/\/$/, '');
        const cleanAllowed = allowedOrigin.replace(/\/$/, '');
        return cleanOrigin === cleanAllowed;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        // Log the failure to help debug production issues
        console.warn(`[CORS] Rejected origin: ${origin}`);
        // Instead of error, we can return false to see if it prevents "crashing"
        // while still blocking the request.
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PMS API')
    .setDescription('PMS')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    '/docs',
    apiReference({
      content: document,
      pageTitle: 'PMS API Reference',
      theme: 'default',
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();
