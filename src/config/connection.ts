import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { TierModel } from '../models/tier.model';
import { UserModel } from '../models/user.model';

const databaseConfiguration: SequelizeModuleOptions = {
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'admin',
  database: 'vpn',
  sync: null,
  logging: false,
  synchronize: false,
  models: [TierModel, UserModel],
};

export default databaseConfiguration;
