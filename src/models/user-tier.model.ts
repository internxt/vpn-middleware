import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { UserModel } from './user.model';
import { TierModel } from './tier.model';

@Table({
  timestamps: true,
  tableName: 'user_tiers',
  underscored: true,
})
export class UserTierModel extends Model {
  @Column({
    type: DataType.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userUuid: string;

  @BelongsTo(() => UserModel, {
    foreignKey: 'userUuid',
    targetKey: 'uuid',
    as: 'user',
  })
  user: UserModel;

  @ForeignKey(() => TierModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  tierId: string;

  @BelongsTo(() => TierModel, {
    foreignKey: 'tierId',
    targetKey: 'id',
    as: 'tier',
  })
  tier: TierModel;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updatedAt: Date;
}
