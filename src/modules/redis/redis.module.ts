import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get('redis.connectionString');

        if (!uri) {
          throw new Error('[CONFIG]: REDIS_CONNECTION_STRING is missing');
        }

        return {
          type: 'single',
          enableAutoPipelining: true,
          showFriendlyErrorStack: true,
          url: configService.get('redis.connectionString'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule {}
