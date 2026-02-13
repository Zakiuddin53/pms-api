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
  'http://localhost:3000', // dev
  'https://arooba-pms.vercel.app', // production frontend
  'https://backendinvestigate360.agency',
];
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins === '*') {
        return callback(null, true);
      }
      
      const envOrigins = corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : [];
      const allAllowedOrigins = [...new Set([...allowedOrigins, ...envOrigins])];
      
      const isAllowed = allAllowedOrigins.some((allowedOrigin) => {
        return origin === allowedOrigin || origin === allowedOrigin + '/';
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`CORS Error: Origin "${origin}" not allowed`);
        callback(new Error('Not allowed by CORS'));
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
