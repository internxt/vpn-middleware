import dotenv from 'dotenv';

dotenv.config({ path: `.env` });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { bootstrapServer } from './forwarder-proxy';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger();

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('VPN API')
    .setDescription('Internxt API middleware')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await Promise.all([
    await app.listen(process.env.PORT ?? 3001),
    await bootstrapServer(),
  ]);

  logger.log(`Application listening on port: ${process.env.PORT ?? 3001}`);
}
bootstrap();
