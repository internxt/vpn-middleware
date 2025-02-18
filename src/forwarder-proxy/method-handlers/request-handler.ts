import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import https from 'https';
import { URL } from 'url';

@Injectable()
export class ProxyRequestService {
  private readonly logger = new Logger(ProxyRequestService.name);

  constructor() {}

  handleRequest({
    proxyUrl,
    proxyAuth,
    req,
    res,
  }: {
    proxyUrl: string;
    proxyAuth: { username: string; password: string };
    req: http.IncomingMessage;
    res: http.ServerResponse<http.IncomingMessage> & {
      req: http.IncomingMessage;
    };
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

    proxyRequest.once('response', (proxyResponse) => {
      if (!proxyResponse.statusCode) {
        this.logger.error('Invalid Proxy Request');
        res.statusCode = 502;
        res.end('Invalid Proxy Request');
        return;
      }

      this.logger.debug(
        `Proxying request to ${url.hostname} - Status: ${proxyResponse.statusCode}`,
      );
      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      proxyResponse.pipe(res);
    });

    proxyRequest.on('error', (err) => {
      this.logger.error(`Proxy request error: ${err.message}`);
      res.statusCode = 502;
      res.end('Proxy request failed');
    });

    req.on('error', () => {
      this.logger.error('HTTP connection aborted by client');
      proxyRequest.destroy();
      req.destroy();
    });

    req.pipe(proxyRequest);
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
