import {
  Inject,
  UnauthorizedException,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserModel } from '../../../models/user.model';
import { UsersService } from '../../users/users.service';
import { UserEntity } from '../../users/entities/user.entity';

export interface JwtPayload {
  email: string;
  bridgeUser: string;
}

const strategyId = 'jwt.standard';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, strategyId) {
  static id = strategyId;

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('secrets.jwt'),
    });
  }

  async validate(payload): Promise<UserEntity> {
    try {
      const { uuid } = payload.payload;
      const user = await this.usersService.getUserByUuid(uuid);

      if (!user) {
        throw new UnauthorizedException();
      }

      return user;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      Logger.error(
        `[AUTH/MIDDLEWARE] ERROR validating authorization ${
          err.message
        }, token payload ${payload}, STACK: ${(err as Error).stack},`,
      );
      throw new UnauthorizedException();
    }
  }
}
