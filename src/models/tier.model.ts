import {
  Table,
  Model,
  Column,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { UserTierModel } from './user-tier.model';
import { TierType } from 'src/enums/tiers.enum';
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
    defaultValue: TierType.INDIVIDUAL,
  })
  type: TierType;

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
