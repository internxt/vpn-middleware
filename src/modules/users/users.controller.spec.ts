import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { newUser } from '../../../test/fixtures';
import { UserEntity } from './entities/user.entity';
import { anonymousUserUuid } from './constants';
import { UserModel } from '../../models/user.model';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let authService: AuthService;

  const mockUser = newUser();
  const mockUserForDecorator: UserModel = {
    uuid: mockUser.uuid,
    tiers: mockUser.tiers,
  } as UserModel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: createMock<UsersService>(),
        },
        {
          provide: AuthService,
          useValue: createMock<AuthService>(),
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        createMock<AuthGuard>({
          canActivate: jest.fn().mockResolvedValue(true),
        }),
      )
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserData', () => {
    it('should call usersService.getOrCreateUserAndTiers and return user data', async () => {
      const ownerIds = ['owner1', 'owner2'];
      const expectedUserData = new UserEntity({ ...mockUser });
      jest
        .spyOn(usersService, 'getOrCreateUserAndTiers')
        .mockResolvedValue(expectedUserData);

      const result = await controller.getUserData(
        mockUserForDecorator,
        ownerIds,
      );

      expect(result).toEqual(expectedUserData);
      expect(usersService.getOrCreateUserAndTiers).toHaveBeenCalledWith(
        mockUser.uuid,
        ownerIds,
      );
    });
  });

  describe('getAnynomousUserToken', () => {
    it('should get anonymous user and create a proxy token', async () => {
      const mockAnonUser = newUser({ attributes: { uuid: anonymousUserUuid } });
      const expectedToken = 'anonymous.jwt.token';

      jest
        .spyOn(usersService, 'getAnynomousUser')
        .mockResolvedValue(mockAnonUser);
      jest
        .spyOn(authService, 'createProxyToken')
        .mockResolvedValue(expectedToken);

      const result = await controller.getAnynomousUserToken();

      expect(result).toEqual({ token: expectedToken });
      expect(usersService.getAnynomousUser).toHaveBeenCalled();
      expect(authService.createProxyToken).toHaveBeenCalledWith(
        { uuid: anonymousUserUuid },
        '5d',
      );
    });
  });
});
