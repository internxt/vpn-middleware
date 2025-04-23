import { Logger } from '@nestjs/common';
import {
  validateVpnConfig,
  validateAllVpnConfigs,
} from './vpn-config.validator';

jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('VpnConfigValidator', () => {
  const validConfig = {
    address: 'http://localhost:8080',
    username: 'user',
    pass: 'pass',
  };
  const zone = 'zoneA';
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateVpnConfig', () => {
    it('should pass for valid configuration', () => {
      expect(() => validateVpnConfig(zone, validConfig)).not.toThrow();
    });

    it('should throw if address is missing', () => {
      const invalidConfig = { ...validConfig, address: '' };
      expect(() => validateVpnConfig(zone, invalidConfig)).toThrow(
        `VPN URL for zone "${zone}" is missing.`,
      );
    });

    it('should throw if port is missing from address', () => {
      const invalidConfig = { ...validConfig, address: 'http://localhost' };
      expect(() => validateVpnConfig(zone, invalidConfig)).toThrow(
        `VPN port for zone "${zone}" is missing.`,
      );
    });

    it('should throw if username is missing', () => {
      const invalidConfig = { ...validConfig, username: '' };
      expect(() => validateVpnConfig(zone, invalidConfig)).toThrow(
        `VPN username for zone "${zone}" is missing.`,
      );
    });

    it('should throw if password is missing', () => {
      const invalidConfig = { ...validConfig, pass: '' };
      expect(() => validateVpnConfig(zone, invalidConfig)).toThrow(
        `VPN password for zone "${zone}" is missing.`,
      );
    });
  });

  describe('validateAllVpnConfigs', () => {
    const validConfigs = {
      zoneA: { ...validConfig, address: 'http://zonea:1111' },
      zoneB: { ...validConfig, address: 'http://zoneb:2222' },
    };

    it('should pass for a valid map of configurations', () => {
      expect(() => validateAllVpnConfigs(validConfigs)).not.toThrow();
    });

    it('should throw if any configuration in the map is invalid', () => {
      const invalidConfigs = {
        ...validConfigs,
        zoneC: { ...validConfig, address: '' },
      };
      expect(() => validateAllVpnConfigs(invalidConfigs)).toThrow(
        `VPN URL for zone "zoneC" is missing.`,
      );
    });

    it('should handle an empty map', () => {
      expect(() => validateAllVpnConfigs({})).not.toThrow();
    });
  });
});
