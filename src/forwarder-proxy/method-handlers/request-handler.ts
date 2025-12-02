import { Injectable, Logger } from '@nestjs/common';
import http from 'http';
import https from 'https';
import { pipeline } from 'stream';
import { Throttle } from 'stream-throttle';
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
    throttlingSpeed,
  }: {
    proxyUrl: string;
    proxyAuth: { username: string; password: string };
    req: http.IncomingMessage;
    res: http.ServerResponse<http.IncomingMessage> & {
      req: http.IncomingMessage;
    };
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
        this.logger.error(`Proxy request error: ${err.message}`);
        res.statusCode = 502;
        res.end('Proxy request failed');
      });

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

      proxyResponse.on('error', (err) => {
        this.logger.debug('Proxy response error', err);
      });

      if (throttlingSpeed) {
        const throttleDownloadStream = new Throttle({ rate: 125000 });
        pipeline(proxyResponse, throttleDownloadStream, res, (err) => {
          if (err) {
            this.logger.error('Error with proxy connection', err);
          }
        });
      } else {
        pipeline(proxyResponse, res, (err) => {
          if (err) {
            this.logger.error('Error with proxy connection', err);
          }
        });
      }
    });

    req.on('error', (err) => {
      this.logger.debug('Request error', err);
      if (!req.destroyed) {
        proxyRequest.destroy();
        req.destroy();
      }
    });

    if (throttlingSpeed) {
      const throttleUploadStream = new Throttle({ rate: 125000 });
      pipeline(req, throttleUploadStream, proxyRequest, (err) => {
        if (err) {
          this.logger.error('Error with proxy connection', err);
        }
      });
    } else {
      pipeline(req, proxyRequest, (err) => {
        if (err) {
          this.logger.error('Error with proxy connection', err);
        }
      });
    }
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
