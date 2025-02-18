import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ProxyModule } from './proxy.module';
import { ForwardProxyServer } from './proxy.service';
import { ConfigService } from '@nestjs/config';
import { validateAllVpnConfigs } from './vpn-config.validator';

export async function bootstrapServer() {
  const app = await NestFactory.createApplicationContext(ProxyModule);
  const proxyService = app.get(ForwardProxyServer);
  const configService = app.get(ConfigService);

  const vpnConfigs = configService.get('vpns');
  validateAllVpnConfigs(vpnConfigs);

  Logger.log('Starting proxy server...');
  await proxyService.startProxyServer();
}
