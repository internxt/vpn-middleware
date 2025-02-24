import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GatewayGuard } from '../auth/gateway.guard';
import { ValidateUUIDPipe } from '../../pipes/validate-uuid.pipe';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('gateway')
@UseGuards(GatewayGuard)
export class GatewayController {
  private logger = new Logger(GatewayController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post('/users/')
  @SerializeOptions({ type: UserEntity })
  @ApiOperation({
    summary: 'Create or update user',
    description: 'Creates or updates a user and its relationship with a tier',
  })
  @ApiResponse({ type: UserEntity })
  async createOrUpdate(@Body() createUserBody: CreateUserDto) {
    this.logger.log(
      `[GATEWAY_CREATE_UPDATE_USER]: Creating or updating user ${createUserBody.uuid}`,
    );
    const userData = await this.usersService.createOrUpdateUser(createUserBody);
    return userData;
  }

  @Delete('/users/:userUuid/tiers/:tierId')
  @ApiOperation({
    summary: 'Delete user by tier',
    description:
      'Deletes users and tier relationship, user will not longer have access to the tier',
  })
  @ApiParam({ name: 'userUuid', required: true })
  @ApiParam({ name: 'tierId', required: true })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUserByTier(
    @Param('userUuid', ValidateUUIDPipe)
    userUuid: string,
    @Param('tierId', ValidateUUIDPipe)
    tierId: string,
  ) {
    this.logger.log(
      `[GATEWAY_DELETE_USER]: Deleting user ${userUuid} from tier ${tierId}`,
    );
    await this.usersService.deleteUserByTier(userUuid, tierId);
  }
}
