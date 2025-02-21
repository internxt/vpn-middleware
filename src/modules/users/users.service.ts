import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { anonymousUserUuid, freeTierId } from './constants';
import { UsersRepository } from './users.repository';
import { UserCacheService } from './userCache.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authCacheService: UserCacheService,
  ) {}

  async getAnynomousUser() {
    return this.getUserByUuid(anonymousUserUuid);
  }

  async getUserByUuid(uuid: string) {
    return this.usersRepository.getUserBy({ uuid });
  }

  async deleteUserByTier(userUuid: string, tierId: string): Promise<number> {
    const deletedRows = await this.usersRepository.deleteUserTier(
      userUuid,
      tierId,
    );
    return deletedRows;
  }

  async getFreeTier() {
    return await this.usersRepository.findTierById(freeTierId);
  }

  async getUserAndTiers(uuid: string) {
    const user = await this.usersRepository.getUserAndTiersByUuid(uuid);

    const allZones = [...new Set(user.tiers.flatMap((tier) => tier.zones))];

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

    return user;
  }
}
