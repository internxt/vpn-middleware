import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { GatewayController } from './gateway.controller';
import { UsersService } from '../users/users.service';
import { Logger } from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserEntity } from '../users/entities/user.entity';
import { GatewayGuard } from '../auth/gateway.guard';

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
      .overrideGuard(GatewayGuard)
      .useValue(
        createMock<GatewayGuard>({
          canActivate: jest.fn().mockResolvedValue(true),
        }),
      )
      .setLogger(createMock<Logger>())
      .compile();

    controller = module.get<GatewayController>(GatewayController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrUpdate', () => {
    it('should call usersService.createOrUpdateUser and return user data', async () => {
      const createUserDto: CreateUserDto = {
        uuid: 'user-uuid',
        tierId: 'tier-uuid',
      };
      const expectedUser = new UserEntity({
        uuid: 'user-uuid',
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
    it('should call usersService.deleteUserByTier', async () => {
      const userUuid = 'user-uuid-to-delete';
      const tierId = 'tier-uuid-to-remove';
      jest.spyOn(usersService, 'deleteUserByTier').mockResolvedValue(1);

      await controller.deleteUserByTier(userUuid, tierId);

      expect(usersService.deleteUserByTier).toHaveBeenCalledWith(
        userUuid,
        tierId,
      );
    });

    it('should handle errors from usersService.deleteUserByTier', async () => {
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
