import { ClassSerializerInterceptor, forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModel } from '../../models/user.model';
import { AuthModule } from '../auth/auth.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UserTierModel } from '../../models/user-tier.model';
import { TierModel } from '../../models/tier.model';
import { UsersRepository } from './users.repository';

@Module({
  imports: [
    SequelizeModule.forFeature([TierModel, UserTierModel, UserModel]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    UsersService,
    UsersRepository,
  ],
  exports: [UsersService, SequelizeModule],
})
export class UsersModule {}
