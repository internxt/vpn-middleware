import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import databaseConfiguration from '../config/connection';
import { UsersModule } from '../modules/users/users.module';
import { ForwardProxyServer } from './proxy.service';
import { ProxyRequestService } from './method-handlers/request-handler';
import { ProxyConnectService } from './method-handlers/connect-handler';
import { AuthModule } from '../modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`],
      load: [configuration],
      isGlobal: true,
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      ...databaseConfiguration,
    }),
    UsersModule,
    AuthModule,
  ],
  providers: [ForwardProxyServer, ProxyRequestService, ProxyConnectService],
  exports: [ForwardProxyServer],
})
export class ProxyModule {}
