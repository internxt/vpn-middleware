import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsUUID(4)
  uuid: string;

  @IsNotEmpty()
  @IsUUID(4)
  tierId: string;
}
