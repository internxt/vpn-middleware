import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { GatewayGuard } from '../auth/gateway.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('/')
  @UseGuards(GatewayGuard)
  async createOrUpdate(@Body() createUserBody: CreateUserDto) {
    const userData = await this.usersService.createOrUpdateUser(createUserBody);
    return userData;
  }

  @Get('/')
  @UseGuards(AuthGuard)
  async getUserData(@User() user) {
    const userData = await this.usersService.getUser(user.uuid);
    return userData;
  }

  @Get('/anonymous/token')
  async getAnynomousUserToken() {
    const anonymousUser = await this.usersService.getAnynomousUser();

    const encodedToken = await this.authService.createProxyToken({
      uuid: anonymousUser.uuid,
    });

    return { token: encodedToken };
  }
}
