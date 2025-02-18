import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { bootstrapServer } from './forwarder-proxy';

async function bootstrap() {
  const logger = new Logger();

  const app = await NestFactory.create(AppModule);

  await Promise.all([
    await app.listen(process.env.PORT ?? 3001),
    await bootstrapServer(),
  ]);

  logger.log(`Application listening on port: ${process.env.PORT ?? 3001}`);
}
bootstrap();
