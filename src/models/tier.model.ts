import {
  Table,
  Model,
  Column,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { UserTierModel } from './user-tier.model';
import { LimitType } from 'src/enums/limits.enum';
import { UserModel } from './user.model';

@Table({
  timestamps: true,
  tableName: 'tiers',
  underscored: true,
})
export class TierModel extends Model {
  @Column({
    type: DataType.UUID,
    allowNull: false,
    primaryKey: true,
  })
  id: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  zones: string[];

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: LimitType.INDIVIDUAL,
  })
  type: LimitType;

  @HasMany(() => UserTierModel)
  userTiers: UserTierModel[];

  @BelongsToMany(() => UserModel, () => UserTierModel, 'userUuid', 'tierId')
  users: UserModel[];

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
