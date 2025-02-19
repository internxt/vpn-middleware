import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([UserModel]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, SequelizeModule],
})
export class UsersModule {}
