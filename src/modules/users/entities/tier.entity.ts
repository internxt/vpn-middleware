import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { TierType } from '../../../enums/tiers.enum';
export class TierEntity {
  constructor(partial: Partial<TierEntity>) {
    Object.assign(this, partial);
  }

  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  zones: string[];

  @Expose()
  @ApiProperty({ enum: TierType })
  type: TierType;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
