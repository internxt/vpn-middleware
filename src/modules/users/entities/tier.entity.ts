import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

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
  @ApiProperty()
  type: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
