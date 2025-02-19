import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { TierModel } from '../../models/tier.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel)
    private userModel: typeof UserModel,
  ) {}

  async getUser(uuid: string) {
    const user = await this.userModel.findOne({
      where: { uuid },
      include: [TierModel],
    });

    return user;
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

    const user = await this.userModel.findOne({
      where: { uuid: createUserDto.uuid },
    });

    if (!user) {
      return this.userModel.create({
        uuid: createUserDto.uuid,
        tierId: createUserDto.tierId,
      });
    }

    await this.userModel.update(
      { tierId: createUserDto.tierId },
      { where: { uuid: createUserDto.uuid } },
    );

    return user;
  }
}
