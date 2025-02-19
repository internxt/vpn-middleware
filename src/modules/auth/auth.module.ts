import { forwardRef, Module } from '@nestjs/common';
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
          // This will set this secret for encoding and decoding JWT tokens with jwtService
          secret: configService.get('secrets.jwt'),
          signOptions: {
            expiresIn: 3600,
          },
        };
      },
    }),
    forwardRef(() => UsersModule),
  ],
  providers: [AuthService, JwtStrategy, GatewayRS256JwtStrategy],
  controllers: [],
  exports: [PassportModule, AuthService, JwtStrategy],
})
export class AuthModule {}
