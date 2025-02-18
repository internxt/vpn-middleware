export interface ProxyToken {
  region: string;
  data: DecodedAuthToken;
}

export interface DecodedAuthToken {
  uuid: string;
}
