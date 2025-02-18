import {
  Inject,
  UnauthorizedException,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  email: string;
  bridgeUser: string;
}

const strategyId = 'jwt.standard';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, strategyId) {
  static id = strategyId;

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('secrets.jwt'),
    });
  }
}
