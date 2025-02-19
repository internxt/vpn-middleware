import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { TierModel } from '../../models/tier.model';
import { anonymousUserUuid } from './constants';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel)
    private userModel: typeof UserModel,
  ) {}

  async getAnynomousUser() {
    return this.getUser(anonymousUserUuid);
  }

  async getUser(uuid: string) {
    const user = await this.userModel.findOne({
      where: { uuid },
      include: [TierModel],
    });

    return this.modelToEntity(user);
  }

  async getUserByUuid(uuid: string) {
    const user = await this.userModel.findOne({
      where: { uuid },
    });

    return user;
  }

  async createOrUpdateUser(createUserDto: CreateUserDto) {
    const tier = await TierModel.findOne({
      where: { id: createUserDto.tierId },
    });

    if (!tier) {
      throw new BadRequestException('Invalid Tier ID');
    }

    const existentUser = await this.userModel.findOne({
      where: { uuid: createUserDto.uuid },
    });

    const updatedUser = existentUser
      ? await existentUser.update({ tierId: createUserDto.tierId })
      : await this.userModel.create({
          uuid: createUserDto.uuid,
          tierId: createUserDto.tierId,
        });

    return this.modelToEntity(updatedUser);
  }

  private modelToEntity(model: UserModel) {
    const user = model?.toJSON() || {};

    return new UserEntity({
      ...user,
    });
  }
}
