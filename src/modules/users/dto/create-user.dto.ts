import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsUUID(4)
  @ApiProperty()
  uuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  @ApiProperty()
  tierId: string;
}
