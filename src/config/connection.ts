import { SequelizeModuleAsyncOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';

const databaseConfiguration: SequelizeModuleAsyncOptions = {
  useFactory: async (configService: ConfigService) => ({
    dialect: 'postgres',
    synchronize: false,
    autoLoadModels: true,
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    username: configService.get('database.username'),
    password: configService.get('database.password'),
    database: configService.get('database.database'),
    dialectOptions: configService.get('isProduction')
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          application_name: 'vpn-middleware',
        }
      : {},
  }),
};

export default databaseConfiguration;
