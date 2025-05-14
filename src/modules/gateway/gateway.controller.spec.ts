import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { GatewayController } from './gateway.controller';
import { UsersService } from '../users/users.service';
import { Logger } from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserEntity } from '../users/entities/user.entity';
import { v4 } from 'uuid';

describe('GatewayController', () => {
  let controller: GatewayController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [
        {
          provide: UsersService,
          useValue: createMock<UsersService>(),
        },
      ],
    })
      .setLogger(createMock<Logger>())
      .compile();

    controller = module.get<GatewayController>(GatewayController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrUpdate', () => {
    it('should call services and return user data', async () => {
      const userUuid = v4();
      const tierId = v4();
      const createUserDto: CreateUserDto = {
        uuid: userUuid,
        tierId: tierId,
      };
      const expectedUser = new UserEntity({
        uuid: userUuid,
        tiers: [],
        zones: [],
      });
      jest
        .spyOn(usersService, 'createOrUpdateUser')
        .mockResolvedValue(expectedUser as any);

      const result = await controller.createOrUpdate(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(usersService.createOrUpdateUser).toHaveBeenCalledWith(
        createUserDto,
      );
    });
  });

  describe('deleteUserByTier', () => {
    it('should call the service with the expected arguments', async () => {
      const userUuid = v4();
      const tierId = v4();

      await controller.deleteUserByTier(userUuid, tierId);

      expect(usersService.deleteUserByTier).toHaveBeenCalledWith(
        userUuid,
        tierId,
      );
    });

    it('should handle errors thrown by the service', async () => {
      const userUuid = 'user-uuid-error';
      const tierId = 'tier-uuid-error';
      const error = new Error('Deletion failed');
      jest.spyOn(usersService, 'deleteUserByTier').mockRejectedValue(error);

      await expect(
        controller.deleteUserByTier(userUuid, tierId),
      ).rejects.toThrow(error);
      expect(usersService.deleteUserByTier).toHaveBeenCalledWith(
        userUuid,
        tierId,
      );
    });
  });
});
