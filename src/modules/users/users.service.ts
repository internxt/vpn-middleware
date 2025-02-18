import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModel)
    private userModel: typeof UserModel,
  ) {}

  async getUser() {
    const user = await this.userModel.findOne({
      where: { uuid: '1133bca9-d451-42ed-8442-f7840af88349' },
    });

    return user;
  }
}
