import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-jest';
import { ForwardProxyServer } from './proxy.service';
import { bootstrapServer } from './index';
import * as VpnConfigValidator from './vpn-config.validator';

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn(),
  },
}));

jest.mock('./vpn-config.validator');

describe('bootstrapServer (index.ts)', () => {
  let mockApp;
  let mockProxyService: jest.Mocked<ForwardProxyServer>;
  let mockConfigService: jest.Mocked<ConfigService>;
  const mockValidateFn = jest.mocked(VpnConfigValidator.validateAllVpnConfigs);
  let mockLoggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoggerLogSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});

    mockProxyService = createMock<ForwardProxyServer>();
    mockConfigService = createMock<ConfigService>();

    mockApp = {
      get: jest.fn((token) => {
        if (token === ForwardProxyServer) {
          return mockProxyService;
        }
        if (token === ConfigService) {
          return mockConfigService;
        }
        return undefined;
      }),
      close: jest.fn(),
    };
    jest
      .mocked(NestFactory.createApplicationContext)
      .mockResolvedValue(mockApp);

    mockConfigService.get.mockReturnValue({ zoneA: 'config' });
  });

  it('should initialize services, validate config, and start proxy server', async () => {
    await bootstrapServer();

    expect(NestFactory.createApplicationContext).toHaveBeenCalled();

    expect(mockApp.get).toHaveBeenCalledWith(ForwardProxyServer);
    expect(mockApp.get).toHaveBeenCalledWith(ConfigService);

    expect(mockConfigService.get).toHaveBeenCalledWith('vpns');

    expect(mockValidateFn).toHaveBeenCalledWith({ zoneA: 'config' });

    expect(mockLoggerLogSpy).toHaveBeenCalledWith('Starting proxy server...');
    expect(mockProxyService.startProxyServer).toHaveBeenCalled();
  });

  it('should throw error if VPN config validation fails', async () => {
    const validationError = new Error('Invalid VPN config');
    mockValidateFn.mockImplementation(() => {
      throw validationError;
    });

    await expect(bootstrapServer()).rejects.toThrow(validationError);

    expect(mockProxyService.startProxyServer).not.toHaveBeenCalled();
    expect(mockLoggerLogSpy).not.toHaveBeenCalledWith(
      'Starting proxy server...',
    );
  });
});
