import { Logger } from '@nestjs/common';
import { InvalidConfigurationError } from './errors/invalid-configuration.error';

const logger = new Logger('VPNConfigValidator');

export const validateVpnConfig = (
  zone: string,
  vpnConfig: { address: string; username: string; pass: string },
) => {
  const { address, username, pass } = vpnConfig;

  if (!address) {
    logger.error(`VPN configuration for zone "${zone}" is missing the URL.`);
    throw new InvalidConfigurationError(
      `VPN URL for zone "${zone}" is missing.`,
    );
  }

  const urlObject = new URL(address);

  if (!urlObject.port) {
    logger.error(`VPN configuration for zone "${zone}" is missing the port.`);
    throw new InvalidConfigurationError(
      `VPN port for zone "${zone}" is missing.`,
    );
  }

  if (!username) {
    logger.error(
      `VPN configuration for zone "${zone}" is missing the username.`,
    );
    throw new InvalidConfigurationError(
      `VPN username for zone "${zone}" is missing.`,
    );
  }

  if (!pass) {
    logger.error(
      `VPN configuration for zone "${zone}" is missing the password.`,
    );
    throw new InvalidConfigurationError(
      `VPN password for zone "${zone}" is missing.`,
    );
  }

  logger.log(`VPN configuration for zone "${zone}" is valid.`);
};

export const validateAllVpnConfigs = (vpnConfigs: {
  [key: string]: { address: string; username: string; pass: string };
}) => {
  Object.entries(vpnConfigs).forEach(([zone, vpnConfig]) => {
    validateVpnConfig(zone, vpnConfig);
  });
};
