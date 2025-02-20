import { AuthTokenPayload } from '../../modules/auth/interfaces';

export interface ProxyToken {
  region: string;
  data: AuthTokenPayload;
}
