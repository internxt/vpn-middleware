import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import databaseConfiguration from './config/connection';
import { UsersModule } from './users/users.module';

@Module({
  imports: [SequelizeModule.forRoot(databaseConfiguration), UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
