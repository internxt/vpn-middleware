import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyProxyToken(token: string): Promise<AuthTokenPayload> {
    const decodedToken = await this.jwtService.verifyAsync<{
      payload: AuthTokenPayload;
    }>(token);

    return decodedToken?.payload;
  }

  async createProxyToken(payload: AuthTokenPayload): Promise<string> {
    const encodedToken = await this.jwtService.signAsync({ payload });

    return encodedToken;
  }
}
