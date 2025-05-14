import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserCacheService } from './users-cache.service';
import { BadRequestException, Logger } from '@nestjs/common';
import { TierType } from '../../enums/tiers.enum';
import { TierEntity } from './entities/tier.entity';
import { UserEntity } from './entities/user.entity';
import { newUser, newTier } from '../../../test/fixtures';
import { anonymousUserUuid, freeTierId } from './constants';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;
  let cacheService: UserCacheService;

  const mockIndividualTier = newTier({
    attributes: { type: TierType.INDIVIDUAL, id: 'ind-tier', zones: ['zoneA'] },
  });
  const mockBusinessTier = newTier({
    attributes: { type: TierType.BUSINESS, id: 'bus-tier', zones: ['zoneB'] },
  });
  const mockFreeTier = newTier({
    attributes: { id: freeTierId, zones: ['zoneC'], type: TierType.INDIVIDUAL },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    })
      .useMocker(createMock)
      .setLogger(createMock<Logger>())
      .compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
    cacheService = module.get<UserCacheService>(UserCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAnynomousUser', () => {
    it('should call getUserByUuid with the anonymousUserUuid', async () => {
      const getUserByUuidSpy = jest.spyOn(service, 'getUserByUuid');
      const mockAnonUser = newUser({ attributes: { uuid: anonymousUserUuid } });
      getUserByUuidSpy.mockResolvedValue(mockAnonUser);

      const result = await service.getAnynomousUser();

      expect(result).toEqual(mockAnonUser);
      expect(getUserByUuidSpy).toHaveBeenCalledWith(anonymousUserUuid);
    });
  });

  describe('getUserByUuid', () => {
    it('should return user from cache if available', async () => {
      const mockUser = newUser({ tiers: [mockIndividualTier] });
      const mockCachedTiers: Record<TierType, TierEntity> = {
        [TierType.INDIVIDUAL]: mockIndividualTier,
        [TierType.BUSINESS]: undefined,
      };
      jest
        .spyOn(cacheService, 'getTiersByUuid')
        .mockResolvedValue(mockCachedTiers);

      const result = await service.getUserByUuid(mockUser.uuid);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.uuid).toEqual(mockUser.uuid);
      expect(result.tiers).toEqual([mockIndividualTier]);
      expect(result.zones).toEqual(mockIndividualTier.zones);
      expect(repository.getUserBy).not.toHaveBeenCalled();
    });

    it('should return user from repository if not in cache', async () => {
      const mockUser = newUser({ tiers: [mockBusinessTier] });
      const mockEmptyCache: Record<TierType, TierEntity> = {
        [TierType.INDIVIDUAL]: undefined,
        [TierType.BUSINESS]: undefined,
      };

      jest
        .spyOn(cacheService, 'getTiersByUuid')
        .mockResolvedValue(mockEmptyCache);
      jest.spyOn(repository, 'getUserBy').mockResolvedValue(mockUser as any);
      jest
        .spyOn(repository, 'findUserTiers')
        .mockResolvedValue(mockUser.tiers as any);
      jest.spyOn(cacheService, 'setUserAndTiers').mockResolvedValue(undefined);

      const result = await service.getUserByUuid(mockUser.uuid);

      expect(result).toEqual(mockUser);
      expect(repository.getUserBy).toHaveBeenCalledWith({
        uuid: mockUser.uuid,
      });
      expect(cacheService.setUserAndTiers).toHaveBeenCalledWith(
        mockUser,
        mockUser.tiers,
      );
    });

    it('should return null if user not found in cache or repo', async () => {
      const uuid = 'non-existent-uuid';
      const mockEmptyCache: Record<TierType, TierEntity> = {
        [TierType.INDIVIDUAL]: undefined,
        [TierType.BUSINESS]: undefined,
      };
      jest
        .spyOn(cacheService, 'getTiersByUuid')
        .mockResolvedValue(mockEmptyCache);
      jest.spyOn(repository, 'getUserBy').mockResolvedValue(null);

      const result = await service.getUserByUuid(uuid);

      expect(result).toBeNull();
      expect(repository.getUserBy).toHaveBeenCalledWith({ uuid });
      expect(repository.findUserTiers).not.toHaveBeenCalled();
      expect(cacheService.setUserAndTiers).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserByTier', () => {
    it('should delete user tier and clear cache if tier exists', async () => {
      const userUuid = 'user-to-delete';
      const tierId = mockBusinessTier.id;
      jest.spyOn(repository, 'deleteUserTier').mockResolvedValue(1);
      jest.spyOn(cacheService, 'deleteUser').mockResolvedValue(undefined);

      const result = await service.deleteUserByTier(userUuid, tierId);

      expect(result).toEqual(1);
      expect(repository.deleteUserTier).toHaveBeenCalledWith(userUuid, tierId);
      expect(repository.findTierById).toHaveBeenCalledWith(tierId);
      expect(cacheService.deleteUser).toHaveBeenCalledWith(userUuid);
    });

    it('should delete user tier but not clear cache if tier doesnt exist', async () => {
      const userUuid = 'user-to-delete';
      const tierId = 'non-existent-tier';
      jest.spyOn(repository, 'deleteUserTier').mockResolvedValue(1);
      jest.spyOn(repository, 'findTierById').mockResolvedValue(null);
      jest.spyOn(cacheService, 'deleteUser').mockResolvedValue(undefined);

      const result = await service.deleteUserByTier(userUuid, tierId);

      expect(result).toEqual(1);
      expect(repository.deleteUserTier).toHaveBeenCalledWith(userUuid, tierId);
      expect(repository.findTierById).toHaveBeenCalledWith(tierId);
      expect(cacheService.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('getFreeTier', () => {
    it('should call repository findTierById with freeTierId', async () => {
      jest.spyOn(repository, 'findTierById').mockResolvedValue(mockFreeTier);
      const result = await service.getFreeTier();
      expect(result).toEqual(mockFreeTier);
      expect(repository.findTierById).toHaveBeenCalledWith(freeTierId);
    });
  });

  describe('getOrCreateUserAndTiers', () => {
    it('should get existing user and tiers and calculate zones', async () => {
      const existingUser = newUser({
        tiers: [mockIndividualTier, mockBusinessTier],
      });
      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(existingUser as any);

      const result = await service.getOrCreateUserAndTiers(existingUser.uuid);

      expect(repository.getUserAndTiersByUuid).toHaveBeenCalledWith(
        existingUser.uuid,
      );
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(repository.createUserTier).not.toHaveBeenCalled();
      expect(result.uuid).toEqual(existingUser.uuid);
      expect(result.tiers).toEqual(existingUser.tiers);
      expect(result.zones).toEqual(expect.arrayContaining(['zoneA', 'zoneB']));
      expect(result.zones.length).toBe(2);
    });

    it('should create user if not found and add free tier', async () => {
      const newUserUuid = 'new-user-uuid';
      const createdUser = newUser({
        attributes: { uuid: newUserUuid },
        tiers: [],
      });
      const userWithFreeTier = { ...createdUser, tiers: [mockFreeTier] };

      jest.spyOn(repository, 'getUserAndTiersByUuid').mockResolvedValue(null);
      jest
        .spyOn(repository, 'createUser')
        .mockResolvedValue(createdUser as any);
      jest.spyOn(repository, 'findTierById').mockResolvedValue(mockFreeTier);
      jest.spyOn(repository, 'createUserTier').mockResolvedValue(undefined);

      const result = await service.getOrCreateUserAndTiers(newUserUuid);

      expect(repository.getUserAndTiersByUuid).toHaveBeenCalledWith(
        newUserUuid,
      );
      expect(repository.createUser).toHaveBeenCalledWith({ uuid: newUserUuid });
      expect(repository.findTierById).toHaveBeenCalledWith(freeTierId);
      expect(repository.createUserTier).toHaveBeenCalledWith(
        newUserUuid,
        mockFreeTier.id,
      );
      expect(result.uuid).toEqual(newUserUuid);
      expect(result.tiers).toEqual([mockFreeTier]);
      expect(result.zones).toEqual(mockFreeTier.zones);
    });

    it('should add free tier if existing user has no tiers', async () => {
      const existingUserNoTiers = newUser({ tiers: [] });
      const userWithFreeTier = {
        ...existingUserNoTiers,
        tiers: [mockFreeTier],
      };

      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(existingUserNoTiers as any);
      jest.spyOn(repository, 'findTierById').mockResolvedValue(mockFreeTier);
      jest.spyOn(repository, 'createUserTier').mockResolvedValue(undefined);

      const result = await service.getOrCreateUserAndTiers(
        existingUserNoTiers.uuid,
      );

      expect(repository.getUserAndTiersByUuid).toHaveBeenCalledWith(
        existingUserNoTiers.uuid,
      );
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(repository.findTierById).toHaveBeenCalledWith(freeTierId);
      expect(repository.createUserTier).toHaveBeenCalledWith(
        existingUserNoTiers.uuid,
        mockFreeTier.id,
      );
      expect(result.uuid).toEqual(existingUserNoTiers.uuid);
      expect(result.tiers).toEqual([mockFreeTier]);
      expect(result.zones).toEqual(mockFreeTier.zones);
    });

    it('should include workspace tiers when calculating zones', async () => {
      const user = newUser({ tiers: [mockIndividualTier] });
      const ownerUuid = 'owner-uuid';
      const workspaceTier = mockBusinessTier;

      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(user as any);
      jest
        .spyOn(repository, 'findUserTierByType')
        .mockResolvedValue(workspaceTier as any);

      const result = await service.getOrCreateUserAndTiers(user.uuid, [
        ownerUuid,
      ]);

      expect(repository.findUserTierByType).toHaveBeenCalledWith(
        ownerUuid,
        TierType.BUSINESS,
      );
      expect(result.zones).toEqual(expect.arrayContaining(['zoneA', 'zoneB']));
      expect(result.zones.length).toBe(2);
    });

    it('should use free tier zones if no other zones are found', async () => {
      const user = newUser({ tiers: [] });

      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(user as any);
      jest.spyOn(repository, 'createUserTier').mockResolvedValue(undefined);
      jest.spyOn(repository, 'findUserTierByType').mockResolvedValue(null);
      const findTierByIdMock = jest
        .spyOn(repository, 'findTierById')
        .mockResolvedValue(mockFreeTier);

      const result = await service.getOrCreateUserAndTiers(user.uuid, [
        'owner1',
      ]);

      expect(result.tiers).toEqual([mockFreeTier]);
      expect(result.zones).toEqual(mockFreeTier.zones);
      expect(findTierByIdMock).toHaveBeenCalledWith(freeTierId);
      expect(findTierByIdMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserAndTiers', () => {
    it('should return user with calculated zones if user exists', async () => {
      const mockUser = newUser({ tiers: [mockIndividualTier] });
      const getUserByUuidSpy = jest
        .spyOn(service, 'getUserByUuid')
        .mockResolvedValue(mockUser);

      const result = await service.getUserAndTiers(mockUser.uuid);

      expect(getUserByUuidSpy).toHaveBeenCalledWith(mockUser.uuid);
      expect(result).toEqual({
        ...mockUser,
        zones: mockIndividualTier.zones,
      });
    });

    it('should return user with free tier zones if user exists but has no zones', async () => {
      const mockTierNoZones = newTier({ attributes: { zones: [] } });
      const mockUser = newUser({ tiers: [mockTierNoZones] });
      const getUserByUuidSpy = jest
        .spyOn(service, 'getUserByUuid')
        .mockResolvedValue(mockUser);
      const findTierByIdMock = jest
        .spyOn(repository, 'findTierById')
        .mockResolvedValue(mockFreeTier);

      const result = await service.getUserAndTiers(mockUser.uuid);

      expect(getUserByUuidSpy).toHaveBeenCalledWith(mockUser.uuid);
      expect(findTierByIdMock).toHaveBeenCalledWith(freeTierId);
      expect(result).toEqual({
        ...mockUser,
        zones: mockFreeTier.zones,
      });
    });

    it('should return null if user does not exist', async () => {
      const uuid = 'non-existent-uuid';
      const getUserByUuidSpy = jest
        .spyOn(service, 'getUserByUuid')
        .mockResolvedValue(null);

      const result = await service.getUserAndTiers(uuid);

      expect(getUserByUuidSpy).toHaveBeenCalledWith(uuid);
      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateUser', () => {
    const createUserDto: CreateUserDto = {
      uuid: 'user-uuid',
      tierId: mockIndividualTier.id,
    };

    it('should create a new user with the specified tier if user does not exist', async () => {
      const newUserEntity = new UserEntity({
        uuid: createUserDto.uuid,
        tiers: [],
        zones: [],
      });
      const finalUserWithTier = new UserEntity({
        uuid: createUserDto.uuid,
        tiers: [mockIndividualTier],
        zones: mockIndividualTier.zones,
      });

      jest
        .spyOn(repository, 'findTierById')
        .mockResolvedValue(mockIndividualTier);
      jest.spyOn(repository, 'getUserBy').mockResolvedValue(null);
      jest
        .spyOn(repository, 'createUser')
        .mockResolvedValue(newUserEntity as any);
      jest.spyOn(repository, 'findUserTiers').mockResolvedValue([]);
      jest.spyOn(repository, 'createUserTier').mockResolvedValue(undefined);
      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(finalUserWithTier as any);
      jest.spyOn(cacheService, 'deleteUser').mockResolvedValue(undefined);

      const result = await service.createOrUpdateUser(createUserDto);

      expect(repository.findTierById).toHaveBeenCalledWith(
        createUserDto.tierId,
      );
      expect(repository.getUserBy).toHaveBeenCalledWith({
        uuid: createUserDto.uuid,
      });
      expect(repository.createUser).toHaveBeenCalledWith({
        uuid: createUserDto.uuid,
      });
      expect(repository.findUserTiers).toHaveBeenCalledWith(createUserDto.uuid);
      expect(repository.deleteUserTier).not.toHaveBeenCalled();
      expect(repository.createUserTier).toHaveBeenCalledWith(
        createUserDto.uuid,
        createUserDto.tierId,
      );
      expect(repository.getUserAndTiersByUuid).toHaveBeenCalledWith(
        createUserDto.uuid,
      );
      expect(cacheService.deleteUser).toHaveBeenCalledWith(createUserDto.uuid);
      expect(result).toEqual(finalUserWithTier);
    });

    it('should update existing user tier if type is the same', async () => {
      const existingUser = new UserEntity({
        uuid: createUserDto.uuid,
        tiers: [mockIndividualTier],
        zones: [],
      });
      const newIndividualTier = newTier({
        attributes: { type: TierType.INDIVIDUAL, id: 'new-ind-id' },
      });
      const dtoWithNewTier: CreateUserDto = {
        uuid: createUserDto.uuid,
        tierId: newIndividualTier.id,
      };
      const finalUserWithNewTier = {
        ...existingUser,
        tiers: [newIndividualTier],
      };

      jest
        .spyOn(repository, 'findTierById')
        .mockResolvedValue(newIndividualTier);
      jest
        .spyOn(repository, 'getUserBy')
        .mockResolvedValue(existingUser as any);
      jest
        .spyOn(repository, 'findUserTiers')
        .mockResolvedValue([mockIndividualTier] as any);
      jest.spyOn(repository, 'deleteUserTier').mockResolvedValue(1);
      jest.spyOn(repository, 'createUserTier').mockResolvedValue(undefined);
      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(finalUserWithNewTier as any);
      jest.spyOn(cacheService, 'deleteUser').mockResolvedValue(undefined);

      const result = await service.createOrUpdateUser(dtoWithNewTier);

      expect(repository.findTierById).toHaveBeenCalledWith(
        dtoWithNewTier.tierId,
      );
      expect(repository.getUserBy).toHaveBeenCalledWith({
        uuid: dtoWithNewTier.uuid,
      });
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(repository.findUserTiers).toHaveBeenCalledWith(
        dtoWithNewTier.uuid,
      );
      expect(repository.deleteUserTier).toHaveBeenCalledWith(
        dtoWithNewTier.uuid,
        mockIndividualTier.id,
      );
      expect(repository.createUserTier).toHaveBeenCalledWith(
        dtoWithNewTier.uuid,
        dtoWithNewTier.tierId,
      );
      expect(repository.getUserAndTiersByUuid).toHaveBeenCalledWith(
        dtoWithNewTier.uuid,
      );
      expect(cacheService.deleteUser).toHaveBeenCalledWith(dtoWithNewTier.uuid);
      expect(result).toEqual(finalUserWithNewTier);
    });

    it('should add new tier if existing user has tier of different type', async () => {
      const existingUser = new UserEntity({
        uuid: createUserDto.uuid,
        tiers: [mockBusinessTier],
        zones: [],
      });
      const dtoWithIndividualTier: CreateUserDto = {
        uuid: createUserDto.uuid,
        tierId: mockIndividualTier.id,
      };
      const finalUserWithBothTiers = {
        ...existingUser,
        tiers: [mockBusinessTier, mockIndividualTier],
      };

      jest
        .spyOn(repository, 'findTierById')
        .mockResolvedValue(mockIndividualTier);
      jest
        .spyOn(repository, 'getUserBy')
        .mockResolvedValue(existingUser as any);
      jest
        .spyOn(repository, 'findUserTiers')
        .mockResolvedValue([mockBusinessTier] as any);
      jest.spyOn(repository, 'createUserTier').mockResolvedValue(undefined);
      jest
        .spyOn(repository, 'getUserAndTiersByUuid')
        .mockResolvedValue(finalUserWithBothTiers as any);
      jest.spyOn(cacheService, 'deleteUser').mockResolvedValue(undefined);

      const result = await service.createOrUpdateUser(dtoWithIndividualTier);

      expect(repository.findTierById).toHaveBeenCalledWith(
        dtoWithIndividualTier.tierId,
      );
      expect(repository.getUserBy).toHaveBeenCalledWith({
        uuid: dtoWithIndividualTier.uuid,
      });
      expect(repository.createUser).not.toHaveBeenCalled();
      expect(repository.findUserTiers).toHaveBeenCalledWith(
        dtoWithIndividualTier.uuid,
      );
      expect(repository.deleteUserTier).not.toHaveBeenCalled();
      expect(repository.createUserTier).toHaveBeenCalledWith(
        dtoWithIndividualTier.uuid,
        dtoWithIndividualTier.tierId,
      );
      expect(repository.getUserAndTiersByUuid).toHaveBeenCalledWith(
        dtoWithIndividualTier.uuid,
      );
      expect(cacheService.deleteUser).toHaveBeenCalledWith(
        dtoWithIndividualTier.uuid,
      );
      expect(result).toEqual(finalUserWithBothTiers);
    });

    it('should throw BadRequestException for invalid tierId', async () => {
      const invalidDto: CreateUserDto = {
        uuid: 'user-uuid',
        tierId: 'invalid-tier-id',
      };
      jest.spyOn(repository, 'findTierById').mockResolvedValue(null);

      await expect(service.createOrUpdateUser(invalidDto)).rejects.toThrow(
        new BadRequestException('Invalid Tier ID'),
      );

      expect(repository.findTierById).toHaveBeenCalledWith(invalidDto.tierId);
      expect(repository.getUserBy).not.toHaveBeenCalled();
    });
  });
});
