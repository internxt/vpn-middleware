import {
  Body,
  Controller,
  Get,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { GatewayGuard } from '../auth/gateway.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';
import { UserModel } from '../../models/user.model';
import { UserEntity } from './entities/user.entity';
import { GetAnonymousUserTokenDto } from './dto/get-anonymous-token.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('/')
  @UseGuards(GatewayGuard)
  @SerializeOptions({ type: UserEntity })
  @ApiOperation({
    summary: 'Create or update user',
  })
  @ApiResponse({ type: UserEntity })
  async createOrUpdate(@Body() createUserBody: CreateUserDto) {
    const userData = await this.usersService.createOrUpdateUser(createUserBody);
    return userData;
  }

  @Get('/')
  @UseGuards(AuthGuard)
  @SerializeOptions({ type: UserEntity })
  @ApiOperation({
    summary: 'Get user data and tier',
  })
  @ApiResponse({ type: UserEntity })
  async getUserData(@User() user: UserModel): Promise<UserEntity> {
    const userData = await this.usersService.getUser(user.uuid);
    return userData;
  }

  @Get('/anonymous/token')
  @ApiOperation({ summary: 'Get token for anynomous users' })
  @ApiResponse({ type: GetAnonymousUserTokenDto })
  async getAnynomousUserToken(): Promise<{ token: string }> {
    const anonymousUser = await this.usersService.getAnynomousUser();

    const encodedToken = await this.authService.createProxyToken({
      uuid: anonymousUser.uuid,
    });

    return { token: encodedToken };
  }
}
