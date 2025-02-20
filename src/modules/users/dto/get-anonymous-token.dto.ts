import { ApiProperty } from '@nestjs/swagger';

export class GetAnonymousUserTokenDto {
  @ApiProperty()
  token: string;
}
