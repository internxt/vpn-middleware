import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { RedisModule } from '@nestjs-modules/ioredis';
import databaseConfiguration from './config/connection';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ExtendedHttpExceptionFilter } from './common/http-exception-filter-extended.exception';

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
    RedisModule,
    UsersModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExtendedHttpExceptionFilter,
    },
    AppService,
  ],
})
export class AppModule {}
