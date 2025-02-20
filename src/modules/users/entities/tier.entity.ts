import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class TierEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  zones: string[];

  @Expose()
  name: string[];

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
