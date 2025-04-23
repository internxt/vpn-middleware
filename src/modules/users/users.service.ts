import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { anonymousUserUuid, freeTierId } from './constants';
import { UsersRepository } from './users.repository';
import { UserCacheService } from './users-cache.service';
import { TierType } from '../../enums/tiers.enum';
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
    const validTiers = tiers.filter((tiers) => tiers && tiers.zones);
    return [...new Set(validTiers.flatMap((tier) => tier.zones))];
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
      ].filter((tier) => tier !== undefined);

      const user = new UserEntity({
        uuid,
        tiers,
        zones: this.zonesFromTiers(tiers),
      });
      return user;
    }

    const user = await this.usersRepository.getUserBy({ uuid });
    if (user) {
      const userTiers = await this.usersRepository.findUserTiers(uuid);
      await this.userCacheService.setUserAndTiers(user, userTiers);
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
      await this.userCacheService.deleteUser(userUuid);
    }

    return deletedRows;
  }

  async getFreeTier() {
    return this.usersRepository.findTierById(freeTierId);
  }

  async getOrCreateUserAndTiers(
    uuid: string,
    workspaceOwnersIds: string[] = [],
  ) {
    let user = await this.usersRepository.getUserAndTiersByUuid(uuid);

    if (!user) {
      user = await this.usersRepository.createUser({ uuid });
    }

    if (!user?.tiers?.length) {
      const freeTier = await this.getFreeTier();
      await this.usersRepository.createUserTier(user.uuid, freeTier.id);
      user.tiers = [freeTier];
    }

    const workspaceTiers = await Promise.all(
      workspaceOwnersIds.map((ownerId) =>
        this.usersRepository.findUserTierByType(ownerId, TierType.BUSINESS),
      ),
    );
    const tiers = [...workspaceTiers, ...user.tiers];
    const allZones = this.zonesFromTiers(tiers);

    if (allZones.length === 0) {
      const freeTier = await this.getFreeTier();
      allZones.push(...freeTier.zones);
    }

    return { ...user, zones: allZones };
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

    const userAndTiers = await this.usersRepository.getUserAndTiersByUuid(
      createUserDto.uuid,
    );

    await this.userCacheService.deleteUser(user.uuid);

    return userAndTiers;
  }
}
