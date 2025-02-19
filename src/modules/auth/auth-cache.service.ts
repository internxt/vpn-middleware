import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class AuthCacheService {
  private readonly USER_PREFIX = 'auth:user:';
  private readonly CACHE_TTL = 3600;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setUser(uuid: string, tierId: string): Promise<void> {
    const key = `${this.USER_PREFIX}${uuid}`;
    await this.redis.set(key, tierId, 'EX', this.CACHE_TTL);
  }

  async userExists(uuid: string): Promise<boolean> {
    const key = `${this.USER_PREFIX}${uuid}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async getUser(uuid: string): Promise<string | null> {
    const key = `${this.USER_PREFIX}${uuid}`;
    return await this.redis.get(key);
  }
}
