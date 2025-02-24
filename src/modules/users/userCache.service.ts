import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserEntity } from './entities/user.entity';
import { TierEntity } from './entities/tier.entity';
import { TierType } from 'src/enums/tiers.enum';

@Injectable()
export class UserCacheService {
  private readonly USER_PREFIX = 'user:';
  private readonly CACHE_TTL = 3600;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  private formatTierData(tier: TierEntity): string {
    return JSON.stringify({
      id: tier.id,
      zones: tier.zones,
    });
  }

  private groupTiersByType(
    tiers: TierEntity[],
  ): Record<TierType, TierEntity[]> {
    return tiers.reduce(
      (acc, tier) => {
        acc[tier.type] = acc[tier.type] || [];
        acc[tier.type].push(tier);
        return acc;
      },
      {} as Record<TierType, TierEntity[]>,
    );
  }

  async setUser(user: UserEntity): Promise<void> {
    const key = `${this.USER_PREFIX}${user.uuid}`;
    const groupedTiers = this.groupTiersByType(user.tiers || []);
    const redisData: Record<string, string> = {};

    // Handle INDIVIDUAL tier
    if (groupedTiers[TierType.INDIVIDUAL]?.length > 0) {
      redisData[TierType.INDIVIDUAL] = this.formatTierData(
        groupedTiers[TierType.INDIVIDUAL][0],
      );
    }

    // Handle BUSINESS tier
    if (groupedTiers[TierType.BUSINESS]?.length > 0) {
      redisData[TierType.BUSINESS] = this.formatTierData(
        groupedTiers[TierType.BUSINESS][0],
      );
    }

    if (Object.keys(redisData).length > 0) {
      // First delete any existing key to avoid type conflicts
      await this.redis.del(key);
      await this.redis.hset(key, redisData);
      // Set expiration
      await this.redis.expire(key, this.CACHE_TTL);
    }
  }

  async userExists(uuid: string): Promise<boolean> {
    const key = `${this.USER_PREFIX}${uuid}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async invalidateUserTier(uuid: string, tierType: TierType) {
    const key = `${this.USER_PREFIX}${uuid}`;
    await this.redis.hdel(key, tierType);
  }

  async getUserTiers(uuid: string, tierType: TierType) {
    const key = `${this.USER_PREFIX}${uuid}`;
    const userData = await this.redis.hget(key, tierType);

    if (!userData) {
      return null;
    }

    return JSON.parse(userData);
  }

  private parseUserDataToTiers(
    userData: Record<string, string>,
  ): Record<TierType, TierEntity> {
    return Object.entries(userData).reduce(
      (acc, [tierType, tierData]) => {
        acc[tierType as TierType] = JSON.parse(tierData) as TierEntity;
        return acc;
      },
      {} as Record<TierType, TierEntity>,
    );
  }

  async getTiersByUuid(uuid: string): Promise<Record<TierType, TierEntity>> {
    const key = `${this.USER_PREFIX}${uuid}`;
    const userData = await this.redis.hgetall(key);

    return this.parseUserDataToTiers(userData);
  }
}
