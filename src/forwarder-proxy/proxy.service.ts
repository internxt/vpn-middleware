import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import { ProxyConnectService } from './method-handlers/connect-handler';
import { ProxyRequestService } from './method-handlers/request-handler';
import { AuthService } from '../modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { ProxyToken } from './interfaces/decoded-token.interface';
import { UsersService } from 'src/modules/users/users.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { ZoneNotPermittedError } from './errors/zone-not-permitted.error';

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
    private readonly usersService: UsersService,
  ) {}

  async startProxyServer() {
    this.loadVpnConfigs();

    const server = http.createServer(async (req, res) => {
      try {
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
      } catch (error) {
        if (error instanceof ZoneNotPermittedError) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('403 Forbidden - Zone access not permitted');
          return;
        }
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    // Https connections need to handle connect to create TLS tunnels
    server.on('connect', async (req, socket, head) => {
      try {
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
      } catch (error) {
        if (error instanceof ZoneNotPermittedError) {
          socket.write('HTTP/1.1 403 Forbidden\r\n');
          socket.write('Content-Type: text/plain\r\n');
          socket.write('\r\n');
          socket.write('403 Forbidden - Zone access not permitted');
          socket.end();
          return;
        }
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.end();
      }
    });

    server.listen(this.configService.get('proxyPort'), () => {
      this.logger.log('Proxy server running on port 8082');
    });
  }

  private async validateToken(token: string): Promise<UserEntity | null> {
    try {
      const decodedToken = await this.authService.verifyProxyToken(token);
      const { uuid, workspaces } = decodedToken;

      let mainUser = await this.usersService.getUserByUuid(uuid);
      if (!mainUser) {
        mainUser = await this.usersService.getOrCreateFreeUser(uuid);
        if (!mainUser) {
          this.logger.error('Main user not found');
          return null;
        }
      }

      if (workspaces?.owners?.length) {
        const ownerPromises = workspaces.owners.map(async (ownerUuid) => {
          return this.usersService.getUserByUuid(ownerUuid);
        });

        const owners = await Promise.all(ownerPromises);
        const validOwners = owners.filter(
          (owner): owner is UserEntity => owner !== null,
        );

        // Merge tiers and zones
        if (validOwners.length > 0) {
          const allTiers = [...(mainUser.tiers || [])];
          validOwners.forEach((owner) => {
            if (owner.tiers) {
              allTiers.push(...owner.tiers);
            }
          });
          mainUser.tiers = allTiers;
          mainUser.zones = [...new Set(allTiers.flatMap((tier) => tier.zones))];
        }
      }

      return mainUser;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      return null;
    }
  }

  private async decodeAuthToken(
    authHeader: string,
  ): Promise<ProxyToken | null> {
    this.logger.debug('Decoding auth token', authHeader);
    const authPrefix = 'Basic ';
    if (!authHeader || !authHeader.startsWith(authPrefix)) {
      this.logger.error('Invalid auth header');
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

    if (!user.zones.includes(region)) {
      this.logger.error(`User does not have access to region: ${region}`);
      throw new ZoneNotPermittedError(region);
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
