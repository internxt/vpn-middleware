import { Controller, Get, SerializeOptions, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../../decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
import { UserModel } from '../../models/user.model';
import { UserEntity } from './entities/user.entity';
import { GetAnonymousUserTokenDto } from './dto/get-anonymous-token.dto';
import { WorkspaceOwnersIds } from '../../decorators/workspace-owners.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  @SerializeOptions({ type: UserEntity, excludeExtraneousValues: true })
  @ApiOperation({
    summary: 'Get user data and tier',
  })
  @ApiResponse({ type: UserEntity })
  async getUserData(
    @User() user: UserModel,
    @WorkspaceOwnersIds() ownerIds: string[],
  ): Promise<UserEntity> {
    const userData = await this.usersService.getOrCreateUserAndTiers(
      user.uuid,
      ownerIds,
    );
    return userData;
  }

  @Get('/anonymous/token')
  @ApiOperation({ summary: 'Get token for anynomous users' })
  @ApiResponse({ type: GetAnonymousUserTokenDto })
  async getAnynomousUserToken(): Promise<{ token: string }> {
    const anonymousUser = await this.usersService.getAnynomousUser();

    const encodedToken = await this.authService.createProxyToken(
      {
        uuid: anonymousUser.uuid,
      },
      '5d',
    );

    return { token: encodedToken };
  }
}
