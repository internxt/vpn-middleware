import {
  Table,
  Model,
  Column,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { UserTierModel } from './user-tier.model';
import { TierModel } from './tier.model';

@Table({
  timestamps: true,
  tableName: 'users',
  underscored: true,
})
export class UserModel extends Model {
  @Column({
    type: DataType.UUID,
    allowNull: false,
    primaryKey: true,
  })
  uuid: string;

  @HasMany(() => UserTierModel)
  userTiers: UserTierModel[];

  @BelongsToMany(() => TierModel, () => UserTierModel, 'userUuid', 'tierId')
  tiers: TierModel[];

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: DataType.NOW,
  })
  updatedAt: Date;
}
