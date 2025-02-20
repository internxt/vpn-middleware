import { Table, Model, Column, DataType, HasMany } from 'sequelize-typescript';
import { UserTierModel } from './user-tier.model';
import { LimitType } from 'src/enums/limits.enum';

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
