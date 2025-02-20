import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class AuthCacheService {
  private readonly USER_PREFIX = 'auth:user:';
  private readonly CACHE_TTL = 3600;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setUser(user: UserEntity): Promise<void> {
    const key = `${this.USER_PREFIX}${user.uuid}`;
    await this.redis.set(key, JSON.stringify(user), 'EX', this.CACHE_TTL);
  }

  async userExists(uuid: string): Promise<boolean> {
    const key = `${this.USER_PREFIX}${uuid}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async getUser(uuid: string): Promise<UserEntity | null> {
    const key = `${this.USER_PREFIX}${uuid}`;
    const userData = await this.redis.get(key);

    if (!userData) {
      return null;
    }

    const parsedUser = JSON.parse(userData);
    return new UserEntity(parsedUser);
  }
}
