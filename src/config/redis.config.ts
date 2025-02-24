import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

export const redisConfiguration = {
  useFactory: async (
    configService: ConfigService,
  ): Promise<RedisModuleOptions> => ({
    type: 'single',
    url: configService.get('redis.connectionString'),
  }),
};
