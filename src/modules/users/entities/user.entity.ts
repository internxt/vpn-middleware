import { Expose, Transform, Type } from 'class-transformer';
import { TierEntity } from './tier.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  @Expose()
  @ApiProperty()
  uuid: string;

  @Expose()
  @ApiProperty()
  tierId: string;

  @Expose()
  @Type(() => TierEntity)
  @ApiProperty({ type: TierEntity, required: false })
  tier?: TierEntity;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;
}
