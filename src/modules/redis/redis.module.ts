import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        url: `redis://:${configService.get('redis.password')}@${configService.get('redis.host')}:${configService.get('redis.port')}`,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule {}
