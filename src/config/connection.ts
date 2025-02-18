import { SequelizeModuleAsyncOptions } from '@nestjs/sequelize';
import { TierModel } from '../models/tier.model';
import { UserModel } from '../models/user.model';
import { ConfigService } from '@nestjs/config';

const databaseConfiguration: SequelizeModuleAsyncOptions = {
  useFactory: async (configService: ConfigService) => ({
    dialect: 'postgres',
    synchronize: false,
    models: [TierModel, UserModel],
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    username: configService.get('database.username'),
    password: configService.get('database.password'),
    database: configService.get('database.database'),

    /*    dialect: 'postgres',
    host: 'localhost',
    username: 'postgres',
    password: 'admin',
    database: 'vpn', */
    /*     replication: !configService.get('isDevelopment')
      ? configService.get('database.replication')
      : false, */
    /*     pool: {
      maxConnections: Number.MAX_SAFE_INTEGER,
      maxIdleTime: 30000,
      max: 20,
      min: 0,
      idle: 20000,
      acquire: 20000,
    },
    dialectOptions: configService.get('isProduction')
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          application_name: 'vpn-middleware',
        }
      : {}, */
  }),
};

export default databaseConfiguration;
