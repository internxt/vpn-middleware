import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import { ProxyConnectService } from './method-handlers/connect-handler';
import { ProxyRequestService } from './method-handlers/request-handler';
import { UsersService } from '../modules/users/users.service';
import { AuthService } from '../modules/auth/auth.service';

@Injectable()
export class ForwardProxyServer {
  private readonly logger = new Logger(ForwardProxyServer.name);
  private proxyList = [];

  constructor(
    private readonly proxyRequestService: ProxyRequestService,
    private readonly proxyConnectService: ProxyConnectService,
    private readonly userService: UsersService,
    private readonly authService: AuthService,
  ) {}

  async startProxyServer() {
    const server = http.createServer(async (req, res) => {
      // This handles any HTTP request
      this.proxyRequestService.handleRequest({
        proxyUrl: this.proxyList[0].url,
        proxyAuth: this.proxyList[0].auth,
        req,
        res,
      });
    });

    // Https connections need to handle connect to create TLS tunnels
    server.on('connect', (req, socket, head) => {
      this.proxyConnectService.handleConnect({
        proxyUrl: this.proxyList[0].url,
        proxyAuth: this.proxyList[0].auth,
        clientSocket: socket,
        req,
      });
    });

    server.listen(8081, () => {
      this.logger.log('Proxy server running on port 8081');
    });
  }
}
