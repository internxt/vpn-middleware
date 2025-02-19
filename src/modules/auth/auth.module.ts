import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { GatewayRS256JwtStrategy } from './strategies/gateway-rs256jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: JwtStrategy.id }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get('secrets.jwt'),
          signOptions: {
            expiresIn: 3600,
          },
        };
      },
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, GatewayRS256JwtStrategy],
  controllers: [],
  exports: [PassportModule, AuthService, JwtStrategy],
})
export class AuthModule {}
