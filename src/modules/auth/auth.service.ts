import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyProxyToken<T>(token: string): Promise<T> {
    const decodedToken = await this.jwtService.verify(token);

    return decodedToken;
  }

  async createProxyToken(payload: AuthTokenPayload): Promise<string> {
    const encodedToken = await this.jwtService.signAsync({ payload });

    return encodedToken;
  }
}
