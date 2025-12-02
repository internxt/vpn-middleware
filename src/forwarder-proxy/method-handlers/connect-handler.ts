import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import https from 'https';
import { Duplex, pipeline } from 'stream';
import { URL } from 'url';
import { Throttle } from 'stream-throttle';

@Injectable()
export class ProxyConnectService {
  private readonly logger = new Logger(ProxyConnectService.name);

  constructor() {}

  handleConnect({
    proxyUrl,
    proxyAuth,
    clientSocket,
    req,
    throttlingSpeed,
  }: {
    proxyUrl: string;
    proxyAuth: { username: string; password: string };
    clientSocket: Duplex;
    req: http.IncomingMessage;
    throttlingSpeed?: number;
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

    const proxyRequest = connectionClient
      .request(options)
      .on('error', (err) => {
        this.logger.error(`CONNECT error: ${err.message}`);
        clientSocket.end('Error connecting through proxy');
      })
      .on('connect', (_proxyRes, proxySocket) => {
        clientSocket.write('HTTP/1.1 200 OK\r\n\r\n');

        proxySocket.on('error', (err) => {
          this.logger.debug('Proxy socket error', err);
        });

        if (throttlingSpeed) {
          const throttleUploadStream = new Throttle({ rate: 125000 });
          const throttleDownloadStream = new Throttle({ rate: 125000 });
          pipeline(
            clientSocket,
            throttleUploadStream,
            proxySocket,
            throttleDownloadStream,
            clientSocket,
            (err) => {
              if (err) {
                this.logger.debug('Error with proxy connection', err);
              }
            },
          );
        } else {
          pipeline(clientSocket, proxySocket, clientSocket, (err) => {
            if (err) {
              this.logger.debug('Error with proxy connection', err);
            }
          });
        }
      });

    clientSocket.on('error', (err) => {
      this.logger.debug('Client socket error', err);
      if (!clientSocket.destroyed) {
        proxyRequest.destroy();
        clientSocket.destroy();
      }
    });

    proxyRequest.end();
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
