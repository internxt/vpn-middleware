import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import { ProxyConnectService } from './method-handlers/connect-handler';
import { ProxyRequestService } from './method-handlers/request-handler';
import { AuthService } from '../modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import {
  DecodedAuthToken,
  ProxyToken,
} from './interfaces/decoded-token.interface';
import { UserModel } from '../models/user.model';
import { AuthCacheService } from '../modules/auth/auth-cache.service';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class ForwardProxyServer {
  private readonly logger = new Logger(ForwardProxyServer.name);
  private vpns: {
    [key: string]: { address: string; username: string; pass: string };
  } = {};

  constructor(
    private readonly proxyRequestService: ProxyRequestService,
    private readonly proxyConnectService: ProxyConnectService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly authCacheService: AuthCacheService,
    private readonly usersService: UsersService,
  ) {}

  async startProxyServer() {
    this.loadVpnConfigs();

    const server = http.createServer(async (req, res) => {
      this.logger.log(`Incoming request: ${req.method} ${req.url}`);
      this.logger.log(`Headers: ${JSON.stringify(req.headers)}`);

      const decodedToken = await this.decodeAuthToken(
        req.headers['proxy-authorization'],
      );

      if (!decodedToken) {
        res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="Proxy"' });
        res.end('407 Invalid token, proxy authentication required');
        return;
      }

      const credentials = this.getVpnCredentials(decodedToken.region);

      // This handles any HTTP request
      this.proxyRequestService.handleRequest({
        proxyUrl: credentials.address,
        proxyAuth: credentials.auth,
        req,
        res,
      });
    });

    // Https connections need to handle connect to create TLS tunnels
    server.on('connect', async (req, socket, head) => {
      this.logger.log(`Incoming CONNECT request: ${req.method} ${req.url}`);

      this.logger.log(`Headers: ${JSON.stringify(req.headers)}`);

      const decodedToken = await this.decodeAuthToken(
        req.headers['proxy-authorization'],
      );

      if (!decodedToken) {
        socket.write('HTTP/1.1 407 Proxy Authentication Required\r\n');
        socket.write('Proxy-Authenticate: Basic realm="Proxy"\r\n');
        socket.write('\r\n');
        socket.end();
        return;
      }

      const credentials = this.getVpnCredentials(decodedToken.region);

      this.proxyConnectService.handleConnect({
        proxyUrl: credentials.address,
        proxyAuth: credentials.auth,
        clientSocket: socket,
        req,
      });
    });

    server.listen(8081, () => {
      this.logger.log('Proxy server running on port 8081');
    });
  }

  private async validateToken(token: string): Promise<UserModel | null> {
    try {
      const decodedToken =
        await this.authService.verifyProxyToken<DecodedAuthToken>(token);
      const { uuid } = decodedToken;

      const existsInCache = await this.authCacheService.userExists(uuid);
      if (existsInCache) {
        return (await this.authCacheService.getUser(
          uuid,
        )) as unknown as UserModel;
      }

      const user = await this.usersService.getUserByUuid(uuid);
      if (!user) {
        return null;
      }

      await this.authCacheService.setUser(uuid, user.tierId);
      return user;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      return null;
    }
  }

  private async decodeAuthToken(
    authHeader: string,
  ): Promise<ProxyToken | null> {
    const authPrefix = 'Basic ';
    if (!authHeader) {
      return null;
    }

    if (!authHeader || !authHeader.startsWith(authPrefix)) {
      return null;
    }

    const encodedCredentials = authHeader.slice(authPrefix.length);

    const decodedCredentials = Buffer.from(
      encodedCredentials,
      'base64',
    ).toString('utf-8');

    const [region, token] = decodedCredentials.split(':');

    const user = await this.validateToken(token);
    if (!user) {
      return null;
    }

    return { region, data: user };
  }

  private loadVpnConfigs() {
    const vpnConfigsFromEnv = this.configService.get('vpns');

    this.vpns = vpnConfigsFromEnv;
  }

  private getVpnCredentials(region: string) {
    const credentials = this.vpns[region];

    if (!credentials) {
      return null;
    }

    return {
      address: credentials.address,
      auth: { username: credentials.username, password: credentials.pass },
    };
  }
}
