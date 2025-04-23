import { Test, TestingModule } from '@nestjs/testing';
import { UserCacheService } from './users-cache.service';
import Redis from 'ioredis';
import { createMock } from '@golevelup/ts-jest';
import { TierType } from '../../enums/tiers.enum';
import { newUser, newTier } from '../../../test/fixtures';
import { Logger } from '@nestjs/common';

const mockRedis = {
  multi: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  hset: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
  hgetall: jest.fn(),
};

describe('UserCacheService', () => {
  let service: UserCacheService;
  let redis: Redis;

  const mockUser = newUser();
  const mockIndividualTier = newTier({
    attributes: { type: TierType.INDIVIDUAL, id: 'ind-tier', zones: ['zoneA'] },
  });
  const mockBusinessTier = newTier({
    attributes: { type: TierType.BUSINESS, id: 'bus-tier', zones: ['zoneB'] },
  });
  const cacheTtl = 1800;
  const userKey = `user:${mockUser.uuid}`;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCacheService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    })
      .setLogger(createMock<Logger>())
      .compile();

    service = module.get<UserCacheService>(UserCacheService);
    redis = module.get<Redis>('default_IORedisModuleConnectionToken');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setUserAndTiers', () => {
    it('should set user with individual tier correctly', async () => {
      const tiers = [mockIndividualTier];
      const expectedRedisData = {
        [TierType.INDIVIDUAL]: JSON.stringify({
          id: mockIndividualTier.id,
          zones: mockIndividualTier.zones,
        }),
      };

      await service.setUserAndTiers(mockUser, tiers);

      expect(mockRedis.multi).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith(userKey);
      expect(mockRedis.hset).toHaveBeenCalledWith(userKey, expectedRedisData);
      expect(mockRedis.expire).toHaveBeenCalledWith(userKey, cacheTtl);
      expect(mockRedis.exec).toHaveBeenCalledTimes(1);
    });

    it('should set user with business tier correctly', async () => {
      const tiers = [mockBusinessTier];
      const expectedRedisData = {
        [TierType.BUSINESS]: JSON.stringify({
          id: mockBusinessTier.id,
          zones: mockBusinessTier.zones,
        }),
      };

      await service.setUserAndTiers(mockUser, tiers);

      expect(mockRedis.multi).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith(userKey);
      expect(mockRedis.hset).toHaveBeenCalledWith(userKey, expectedRedisData);
      expect(mockRedis.expire).toHaveBeenCalledWith(userKey, cacheTtl);
      expect(mockRedis.exec).toHaveBeenCalledTimes(1);
    });

    it('should set user with both individual and business tiers correctly', async () => {
      const tiers = [mockIndividualTier, mockBusinessTier];
      const expectedRedisData = {
        [TierType.INDIVIDUAL]: JSON.stringify({
          id: mockIndividualTier.id,
          zones: mockIndividualTier.zones,
        }),
        [TierType.BUSINESS]: JSON.stringify({
          id: mockBusinessTier.id,
          zones: mockBusinessTier.zones,
        }),
      };

      await service.setUserAndTiers(mockUser, tiers);

      expect(mockRedis.multi).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith(userKey);
      expect(mockRedis.hset).toHaveBeenCalledWith(userKey, expectedRedisData);
      expect(mockRedis.expire).toHaveBeenCalledWith(userKey, cacheTtl);
      expect(mockRedis.exec).toHaveBeenCalledTimes(1);
    });

    it('should not call redis if no tiers are provided', async () => {
      await service.setUserAndTiers(mockUser, []);

      expect(mockRedis.multi).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(mockRedis.hset).not.toHaveBeenCalled();
      expect(mockRedis.expire).not.toHaveBeenCalled();
      expect(mockRedis.exec).not.toHaveBeenCalled();
    });

    it('should handle null or undefined tiers array', async () => {
      await service.setUserAndTiers(mockUser, null);
      expect(mockRedis.multi).not.toHaveBeenCalled();

      await service.setUserAndTiers(mockUser, undefined);
      expect(mockRedis.multi).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should call redis.del with the correct user key', async () => {
      await service.deleteUser(mockUser.uuid);

      expect(mockRedis.del).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith(userKey);
    });
  });

  describe('getTiersByUuid', () => {
    it('should return parsed tiers from redis cache', async () => {
      const cachedData = {
        [TierType.INDIVIDUAL]: JSON.stringify({
          id: mockIndividualTier.id,
          zones: mockIndividualTier.zones,
        }),
        [TierType.BUSINESS]: JSON.stringify({
          id: mockBusinessTier.id,
          zones: mockBusinessTier.zones,
        }),
      };
      mockRedis.hgetall.mockResolvedValue(cachedData);

      const result = await service.getTiersByUuid(mockUser.uuid);

      expect(mockRedis.hgetall).toHaveBeenCalledWith(userKey);
      expect(result).toEqual({
        [TierType.INDIVIDUAL]: {
          id: mockIndividualTier.id,
          zones: mockIndividualTier.zones,
        },
        [TierType.BUSINESS]: {
          id: mockBusinessTier.id,
          zones: mockBusinessTier.zones,
        },
      });
    });

    it('should return an empty object if no data is found in cache', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.getTiersByUuid(mockUser.uuid);

      expect(mockRedis.hgetall).toHaveBeenCalledWith(userKey);
      expect(result).toEqual({});
    });

    it('should return an empty object if hgetall returns null', async () => {
      mockRedis.hgetall.mockResolvedValue(null);

      const result = await service.getTiersByUuid(mockUser.uuid);

      expect(mockRedis.hgetall).toHaveBeenCalledWith(userKey);
      expect(result).toEqual({});
    });
  });
});
