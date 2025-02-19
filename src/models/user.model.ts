import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
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
  uuid: string;

  @ForeignKey(() => TierModel)
  @Column({
    type: DataType.UUIDV4,
    allowNull: false,
  })
  tierId: string;

  @BelongsTo(() => TierModel, 'tierId')
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
