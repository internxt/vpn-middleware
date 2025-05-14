import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { UsersRepository } from './users.repository';
import { UserModel } from '../../models/user.model';
import { TierModel } from '../../models/tier.model';
import { UserTierModel } from '../../models/user-tier.model';
import { UserEntity } from './entities/user.entity';
import { TierEntity } from './entities/tier.entity';
import { newTier, newUser } from '../../../test/fixtures';
import { TierType } from '../../enums/tiers.enum';
import { createMock } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';

const createMockModelInstance = (data: any, tiers?: any[]) => ({
  ...data,
  tiers: tiers?.map((t) => ({ ...t, toJSON: () => t })) ?? [],
  toJSON: () => ({ ...data, tiers: tiers ?? [] }),
});

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let userModel: jest.Mocked<typeof UserModel>;
  let tierModel: jest.Mocked<typeof TierModel>;
  let userTierModel: jest.Mocked<typeof UserTierModel>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersRepository],
    })
      .useMocker(() => createMock())
      .setLogger(createMock<Logger>())
      .compile();

    repository = module.get<UsersRepository>(UsersRepository);
    userModel = module.get(getModelToken(UserModel));
    tierModel = module.get(getModelToken(TierModel));
    userTierModel = module.get(getModelToken(UserTierModel));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user and return the entity', async () => {
      const userData = newUser();
      const mockCreatedUser = createMockModelInstance(userData);
      userModel.create.mockResolvedValue(mockCreatedUser);

      const result = await repository.createUser(userData);

      expect(userModel.create).toHaveBeenCalledWith(userData);
      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.uuid).toEqual(userData.uuid);
    });

    it('should return null if user creation fails', async () => {
      const userData = newUser();
      userModel.create.mockResolvedValue(null);

      const result = await repository.createUser(userData);

      expect(userModel.create).toHaveBeenCalledWith(userData);
      expect(result).toBeNull();
    });
  });

  describe('getUserBy', () => {
    it('should find a user by given criteria and return entity', async () => {
      const mockTier = newTier();
      const mockUser = newUser({ tiers: [mockTier] });
      const mockFoundUser = createMockModelInstance(mockUser, [mockTier]);
      const criteria = { uuid: mockUser.uuid };
      userModel.findOne.mockResolvedValue(mockFoundUser);

      const result = await repository.getUserBy(criteria);

      expect(userModel.findOne).toHaveBeenCalledWith({
        where: criteria,
        include: [
          {
            model: TierModel,
            as: 'tiers',
            attributes: ['id', 'type', 'zones'],
          },
        ],
      });
      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.uuid).toEqual(mockUser.uuid);
      expect(result?.tiers?.[0]?.id).toEqual(mockTier.id);
    });

    it('should return null if user not found', async () => {
      const criteria = { uuid: 'non-existent' };
      userModel.findOne.mockResolvedValue(null);

      const result = await repository.getUserBy(criteria);

      expect(userModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: criteria }),
      );
      expect(result).toBeNull();
    });
  });

  describe('createUserTier', () => {
    it('should create a user-tier relationship', async () => {
      const userUuid = 'user-uuid';
      const tierId = 'tier-id';
      const mockCreatedUserTier = { userUuid, tierId };
      userTierModel.create.mockResolvedValue(mockCreatedUserTier);

      const result = await repository.createUserTier(userUuid, tierId);

      expect(userTierModel.create).toHaveBeenCalledWith({
        userUuid,
        tierId,
      });
      expect(result).toEqual(mockCreatedUserTier);
    });
  });

  describe('getUserAndTiersByUuid', () => {
    it('should find a user and associated tiers by UUID', async () => {
      const mockTier = newTier();
      const mockUser = newUser({ tiers: [mockTier] });
      const mockFoundUser = createMockModelInstance(mockUser, [mockTier]);
      userModel.findOne.mockResolvedValue(mockFoundUser);

      const result = await repository.getUserAndTiersByUuid(mockUser.uuid);

      expect(userModel.findOne).toHaveBeenCalledWith({
        where: { uuid: mockUser.uuid },
        include: [
          {
            model: TierModel,
            as: 'tiers',
            attributes: ['id', 'type', 'zones'],
            through: { attributes: [] },
          },
        ],
      });
      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.uuid).toEqual(mockUser.uuid);
      expect(result?.tiers?.[0]?.id).toEqual(mockTier.id);
    });
  });

  describe('deleteUserTier', () => {
    it('should delete a user-tier relationship', async () => {
      const userUuid = 'user-uuid';
      const tierId = 'tier-id';
      const expectedDeletedRows = 1;
      userTierModel.destroy.mockResolvedValue(expectedDeletedRows);

      const result = await repository.deleteUserTier(userUuid, tierId);

      expect(userTierModel.destroy).toHaveBeenCalledWith({
        where: { userUuid, tierId },
      });
      expect(result).toEqual(expectedDeletedRows);
    });
  });

  describe('findTierById', () => {
    it('should find a tier by ID and return entity', async () => {
      const mockTier = newTier();
      const mockFoundTier = createMockModelInstance(mockTier);
      tierModel.findOne.mockResolvedValue(mockFoundTier);

      const result = await repository.findTierById(mockTier.id);

      expect(tierModel.findOne).toHaveBeenCalledWith({
        where: { id: mockTier.id },
      });
      expect(result).toBeInstanceOf(TierEntity);
      expect(result?.id).toEqual(mockTier.id);
    });

    it('should return null if tier not found by ID', async () => {
      const tierId = 'non-existent';
      tierModel.findOne.mockResolvedValue(null);

      const result = await repository.findTierById(tierId);

      expect(tierModel.findOne).toHaveBeenCalledWith({
        where: { id: tierId },
      });
      expect(result).toBeNull();
    });
  });

  describe('findUserTierByType', () => {
    it('should find a tier of a specific type for a user', async () => {
      const userUuid = 'user-uuid';
      const type = TierType.BUSINESS;
      const mockTier = newTier({ attributes: { type } });
      const mockFoundTier = createMockModelInstance(mockTier);
      tierModel.findOne.mockResolvedValue(mockFoundTier);

      const result = await repository.findUserTierByType(userUuid, type);

      expect(tierModel.findOne).toHaveBeenCalledWith({
        where: { type },
        include: {
          model: UserTierModel,
          where: { userUuid },
        },
      });
      expect(result).toBeInstanceOf(TierEntity);
      expect(result?.type).toEqual(type);
    });
  });

  describe('findUserTiers', () => {
    it('should find all tiers associated with a user', async () => {
      const userUuid = 'user-uuid';
      const mockTiers = [newTier(), newTier()];
      const mockFoundTiers = mockTiers.map((t) => createMockModelInstance(t));
      tierModel.findAll.mockResolvedValue(mockFoundTiers);

      const result = await repository.findUserTiers(userUuid);

      expect(tierModel.findAll).toHaveBeenCalledWith({
        include: {
          model: UserTierModel,
          where: { userUuid },
          attributes: [],
        },
      });
      expect(result).toHaveLength(mockTiers.length);
      expect(result[0]).toBeInstanceOf(TierEntity);
      expect(result[1]).toBeInstanceOf(TierEntity);
    });
  });
});
