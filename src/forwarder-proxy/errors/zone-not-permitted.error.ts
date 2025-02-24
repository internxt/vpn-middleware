export class ZoneNotPermittedError extends Error {
  constructor(region: string) {
    super(`Access to region ${region} is not permitted for this user`);
    this.name = 'ZoneNotPermittedError';
  }
}
