import { Table, Model, Column, DataType, HasMany } from 'sequelize-typescript';
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

  @HasMany(() => UserModel)
  players: UserModel[];

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
