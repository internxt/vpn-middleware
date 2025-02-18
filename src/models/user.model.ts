import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
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
  id: string;

  @ForeignKey(() => TierModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  tierId: string;

  @BelongsTo(() => TierModel)
  tier: TierModel;

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
