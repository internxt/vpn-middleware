import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserEntity } from './entities/user.entity';
import { TierEntity } from './entities/tier.entity';
import { TierType } from '../../enums/tiers.enum';

@Injectable()
export class UserCacheService {
  private readonly USER_PREFIX = 'user:';
  private readonly CACHE_TTL = 1800;

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

  async setUserAndTiers(user: UserEntity, tiers: TierEntity[]): Promise<void> {
    const key = `${this.USER_PREFIX}${user.uuid}`;

    const groupedTiers = this.groupTiersByType(tiers || []);
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
      await this.redis
        .multi()
        .del(key)
        .hset(key, redisData)
        .expire(key, this.CACHE_TTL)
        .exec();
    }
  }

  async deleteUser(uuid: string) {
    const key = `${this.USER_PREFIX}${uuid}`;
    await this.redis.del(key);
  }

  private parseUserDataToTiers(
    userData: Record<string, string>,
  ): Record<TierType, TierEntity> {
    if (!userData) {
      return {} as Record<TierType, TierEntity>;
    }
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
