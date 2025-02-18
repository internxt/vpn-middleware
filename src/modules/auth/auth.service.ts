import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyProxyToken(token: string) {
    const decodedToken = await this.jwtService.verify(token);

    return decodedToken;
  }
}
