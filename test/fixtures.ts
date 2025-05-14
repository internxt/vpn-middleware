import { v4 } from 'uuid';
import { Chance } from 'chance';
import { TierEntity } from '../src/modules/users/entities/tier.entity';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { TierType } from '../src/enums/tiers.enum';

const randomDataGenerator = new Chance();

export const newTier = (params?: {
  attributes?: Partial<TierEntity>;
}): TierEntity => {
  const tier = new TierEntity({
    id: v4(),
    zones: [randomDataGenerator.word(), randomDataGenerator.word()],
    type: randomDataGenerator.pickone([TierType.INDIVIDUAL, TierType.BUSINESS]),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  params?.attributes &&
    Object.keys(params.attributes).forEach((key) => {
      tier[key] = params.attributes[key];
    });

  return tier;
};

export const newUser = (params?: {
  attributes?: Partial<UserEntity>;
  tiers?: TierEntity[];
}): UserEntity => {
  const tiers = params?.tiers ?? [newTier()];
  const user = new UserEntity({
    uuid: v4(),
    tiers: tiers,
    zones: [...new Set(tiers.flatMap((t) => t?.zones || []))],
  });

  params?.attributes &&
    Object.keys(params.attributes).forEach((key) => {
      user[key] = params.attributes[key];
    });

  return user;
};

export const newCacheEntry = (
  key?: string,
  value?: any,
): { key: string; value: any } => {
  return {
    key: key || randomDataGenerator.string({ length: 10 }),
    value: value || randomDataGenerator.word(),
  };
};
