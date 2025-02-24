import { Expose, Type } from 'class-transformer';
import { TierEntity } from './tier.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  @Expose()
  @ApiProperty()
  uuid: string;

  @Type(() => TierEntity)
  tiers?: TierEntity[];

  @Expose()
  @ApiProperty({
    type: [String],
    description: 'All the zones user has access to',
  })
  zones: string[];

  @Expose()
  @ApiProperty()
  createdAt?: Date;

  @Expose()
  @ApiProperty()
  updatedAt?: Date;
}
