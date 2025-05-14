export class InvalidConfigurationError extends Error {
  constructor(message: string) {
    super(
      message ??
        `There was an error in the configuration of the VPN proxy. Please check the environment variables.`,
    );
    this.name = 'InvalidConfigurationError';
  }
}
