import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserModel } from '../models/user.model';

@Controller('users')
export class UsersController {
  constructor(
    @InjectModel(UserModel)
    private userModel: typeof UserModel,
  ) {}

  @Get('/')
  async getHello() {
    const user = await this.userModel.findOne({
      where: { id: '1133bca9-d451-42ed-8442-f7840af88349' },
    });

    return user;
  }
}
