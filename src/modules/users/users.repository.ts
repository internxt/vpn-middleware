import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { UserTierModel } from '../../models/user-tier.model';
import { TierModel } from '../../models/tier.model';
import { UserEntity } from './entities/user.entity';
import { TierEntity } from './entities/tier.entity';
import { TierType } from 'src/enums/tiers.enum';
@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(UserModel)
    private readonly userModel: typeof UserModel,
    @InjectModel(UserTierModel)
    private readonly userTierModel: typeof UserTierModel,
    @InjectModel(TierModel)
    private readonly tierModel: typeof TierModel,
  ) {}

  async createUser(
    newUserData: Partial<UserEntity>,
  ): Promise<UserEntity | null> {
    const user = await this.userModel.create(newUserData);
    return user ? this.userModelToEntity(user) : null;
  }

  async getUserBy(where: Partial<UserEntity>): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({
      where,
      include: [
        { model: TierModel, as: 'tiers', attributes: ['id', 'type', 'zones'] },
      ],
    });
    return user ? this.userModelToEntity(user) : null;
  }

  async createUserTier(userUuid: string, tierId: string) {
    const userTier = await this.userTierModel.create({ userUuid, tierId });
    return userTier;
  }

  async getUserAndTiersByUuid(uuid: string): Promise<UserEntity | null> {
    const user = await this.userModel.findOne({
      where: { uuid },
      include: [
        {
          model: TierModel,
          as: 'tiers',
          attributes: ['id', 'type', 'zones'],
          through: { attributes: [] },
        },
      ],
    });
    return user ? this.userModelToEntity(user) : null;
  }

  async deleteUserTier(userUuid: string, tierId: string): Promise<number> {
    return this.userTierModel.destroy({ where: { userUuid, tierId } });
  }

  async findTierById(tierId: string): Promise<TierEntity | null> {
    const tier = await this.tierModel.findOne({ where: { id: tierId } });
    return tier ? this.tierModelToEntity(tier) : null;
  }

  async findUserTierByType(
    userUuid: string,
    type: TierType,
  ): Promise<TierEntity | null> {
    const tier = await this.tierModel.findOne({
      where: { type },
      include: {
        model: UserTierModel,
        where: { userUuid },
      },
    });
    return tier ? this.tierModelToEntity(tier) : null;
  }

  async findUserTiers(userUuid: string): Promise<TierEntity[]> {
    const tiers = await this.tierModel.findAll({
      include: {
        model: UserTierModel,
        where: { userUuid },
        attributes: [],
      },
    });
    return tiers.map((tier) => this.tierModelToEntity(tier));
  }

  private userModelToEntity(model: UserModel) {
    const user = model?.toJSON() || {};
    const tiers = model?.tiers?.map((tier) => tier);

    return new UserEntity({
      ...user,
      tiers: tiers?.map(this.tierModelToEntity.bind(this)),
    });
  }

  private tierModelToEntity(model: TierModel) {
    const tier = model?.toJSON() || {};
    return new TierEntity({
      ...tier,
    });
  }
}
