import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { anonymousUserUuid, freeTierId } from './constants';
import { UsersRepository } from './users.repository';
import { UserCacheService } from './userCache.service';
import { TierType } from 'src/enums/tiers.enum';
import { UserEntity } from './entities/user.entity';
import { TierEntity } from './entities/tier.entity';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userCacheService: UserCacheService,
  ) {}

  private zonesFromTiers(tiers: TierEntity[]) {
    return [...new Set(tiers.flatMap((tier) => tier.zones))];
  }

  async getAnynomousUser() {
    return this.getUserByUuid(anonymousUserUuid);
  }

  async getUserByUuid(uuid: string) {
    const cachedTiers = await this.userCacheService.getTiersByUuid(uuid);

    if (cachedTiers[TierType.INDIVIDUAL] || cachedTiers[TierType.BUSINESS]) {
      const tiers = [
        cachedTiers[TierType.INDIVIDUAL],
        cachedTiers[TierType.BUSINESS],
      ];
      const user = new UserEntity({
        uuid,
        tiers,
        zones: this.zonesFromTiers(tiers),
      });
      this.logger.log('Cache hit', user);
      return user;
    }

    const user = await this.usersRepository.getUserBy({ uuid });
    if (user) {
      await this.userCacheService.setUser(user);
    }
    return user;
  }

  async getOrCreateFreeUser(uuid: string) {
    let user = await this.getUserByUuid(uuid);

    if (!user) {
      user = await this.usersRepository.createUser({ uuid });
      const userTier = await this.usersRepository.createUserTier(
        uuid,
        freeTierId,
      );
      user.tiers.push(userTier.tier);
      await this.userCacheService.setUser(user);
    }

    return user;
  }

  async deleteUserByTier(userUuid: string, tierId: string): Promise<number> {
    const deletedRows = await this.usersRepository.deleteUserTier(
      userUuid,
      tierId,
    );

    const tier = await this.usersRepository.findTierById(tierId);

    if (tier) {
      await this.userCacheService.invalidateUserTier(userUuid, tier.type);
    }

    return deletedRows;
  }

  async getFreeTier() {
    return await this.usersRepository.findTierById(freeTierId);
  }

  async getUserAndTiers(uuid: string) {
    const user = await this.getUserByUuid(uuid);
    if (!user) return null;

    const allZones = this.zonesFromTiers(user.tiers);

    if (allZones.length === 0) {
      const freeTier = await this.getFreeTier();
      allZones.push(...freeTier.zones);
    }

    return { ...user, zones: allZones };
  }

  async createOrUpdateUser(createUserDto: CreateUserDto) {
    const tier = await this.usersRepository.findTierById(createUserDto.tierId);

    if (!tier) {
      throw new BadRequestException('Invalid Tier ID');
    }

    let user = await this.usersRepository.getUserBy({
      uuid: createUserDto.uuid,
    });

    if (!user) {
      user = await this.usersRepository.createUser({
        uuid: createUserDto.uuid,
      });
    }

    const userCurrentTiers = await this.usersRepository.findUserTiers(
      createUserDto.uuid,
    );

    const sameTypeTier = userCurrentTiers.find(
      (userTier) => userTier.type === tier.type,
    );

    if (sameTypeTier) {
      await this.usersRepository.deleteUserTier(
        createUserDto.uuid,
        sameTypeTier.id,
      );
    }

    await this.usersRepository.createUserTier(
      createUserDto.uuid,
      createUserDto.tierId,
    );

    const cachedUserTiers = await this.userCacheService.getTiersByUuid(
      createUserDto.uuid,
    );

    cachedUserTiers[tier.type] = tier;

    user.tiers = [
      cachedUserTiers[TierType.INDIVIDUAL],
      cachedUserTiers[TierType.BUSINESS],
    ];

    await this.userCacheService.setUser(user);

    return user;
  }
}
