import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

export const redisConfiguration = {
  useFactory: async (
    configService: ConfigService,
  ): Promise<RedisModuleOptions> => ({
    type: 'single',
    url: `redis://:${configService.get('redis.password')}@${configService.get(
      'redis.host',
    )}:${configService.get('redis.port')}`,
  }),
};
