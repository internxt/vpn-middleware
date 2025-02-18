import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyProxyToken<T>(token: string): Promise<T> {
    const decodedToken = await this.jwtService.verify(token);

    return decodedToken;
  }
}
