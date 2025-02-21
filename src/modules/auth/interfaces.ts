export interface AuthTokenPayload {
  uuid: string;
  workspaces?: {
    owners: string[];
  };
}
