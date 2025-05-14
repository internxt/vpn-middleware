import dotenv from 'dotenv';

dotenv.config({ path: `.env` });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { bootstrapServer } from './forwarder-proxy';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import configuration from './config/configuration';

const config = configuration();

async function bootstrap() {
  const logger = new Logger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      colors: config.isDevelopment,
      prefix: 'Proxy-api',
      compact: true,
    }),
  });

  app.useGlobalPipes(new ValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('VPN API')
    .setDescription('Internxt API middleware')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.enableCors();
  app.use(helmet());
  app.disable('x-powered-by');

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);

  await Promise.all([
    await app.listen(process.env.PORT ?? 3001),
    await bootstrapServer(),
  ]);

  logger.log(`Application listening on port: ${process.env.PORT ?? 3001}`);
}
bootstrap();
