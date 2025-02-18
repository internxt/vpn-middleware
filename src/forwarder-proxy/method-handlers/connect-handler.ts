import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import https from 'https';
import { Duplex } from 'stream';
import { URL } from 'url';

@Injectable()
export class ProxyConnectService {
  private readonly logger = new Logger(ProxyConnectService.name);

  constructor() {}

  handleConnect({
    proxyUrl,
    proxyAuth,
    clientSocket,
    req,
  }: {
    proxyUrl: string;
    proxyAuth: { username: string; password: string };
    clientSocket: Duplex;
    req: http.IncomingMessage;
  }) {
    const url = new URL(proxyUrl);

    const connectionClient = url.protocol === 'https:' ? https : http;

    const headers = {
      ...this.addProxyAuthToHeaders(
        req.headers,
        proxyAuth.username,
        proxyAuth.password,
      ),
      Host: req.url!.split(':')[0], // Extract target host
    };

    const options = {
      method: req.method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: req.url,
      headers: headers,
      rejectUnauthorized: false,
    };

    const proxyRequest = connectionClient.request(options);

    proxyRequest.on('connect', (proxyRes, proxySocket) => {
      //this.logger.debug(`Connected through proxy: ${req.url}`);
      clientSocket.write('HTTP/1.1 200 OK\r\n\r\n');
      clientSocket.pipe(proxySocket);
      proxySocket.pipe(clientSocket);
    });

    proxyRequest.on('error', (err) => {
      this.logger.error(`CONNECT error: ${err.message}`);
      clientSocket.end('Error connecting through proxy');
    });

    proxyRequest.end();

    clientSocket.on('error', () => {
      this.logger.error('Connection aborted by client');
      proxyRequest.destroy();
      clientSocket.destroy();
    });
  }

  private addProxyAuthToHeaders(
    headers: http.IncomingHttpHeaders,
    username: string,
    password: string,
  ) {
    delete headers['Proxy-Authorization'];
    delete headers['proxy-authorization'];

    return {
      ...headers,
      'proxy-authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };
  }
}
