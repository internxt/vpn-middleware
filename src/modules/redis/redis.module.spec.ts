import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { RedisModule } from './redis.module';

describe('RedisModule', () => {
  let module: TestingModule;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'redis.connectionString') {
        return 'redis://mock-redis:6379';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RedisModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide NestRedisModule', () => {
    const redisModule = module.get(NestRedisModule);
    expect(redisModule).toBeDefined();
  });

  it('should configure NestRedisModule using ConfigService', async () => {
    expect(configService.get).toHaveBeenCalledWith('redis.connectionString');
  });

  it('should throw error if REDIS_CONNECTION_STRING is missing', async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [RedisModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockReturnValue(null),
      });

    await expect(moduleBuilder.compile()).rejects.toThrow(
      '[CONFIG]: REDIS_CONNECTION_STRING is missing',
    );
  });
});
