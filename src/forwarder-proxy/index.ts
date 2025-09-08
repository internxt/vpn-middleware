import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { ProxyModule } from './proxy.module';
import { ForwardProxyServer } from './proxy.service';
import { ConfigService } from '@nestjs/config';
import { validateAllVpnConfigs } from './vpn-config.validator';
import configuration from '../config/configuration';

const config = configuration();

export async function bootstrapServer() {
  const app = await NestFactory.createApplicationContext(ProxyModule, {
    logger: new ConsoleLogger({
      colors: config.isDevelopment,
      prefix: 'Proxy-middleware',
      compact: true,
      logLevels: config.isDevelopment ? ['debug'] : ['log'],
    }),
  });
  const proxyService = app.get(ForwardProxyServer);
  const configService = app.get(ConfigService);

  const vpnConfigs = configService.get('vpns');
  validateAllVpnConfigs(vpnConfigs);

  Logger.log('Starting proxy server...');
  await proxyService.startProxyServer();
}
