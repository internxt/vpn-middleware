import http from 'http';
import https from "https";
import { URL } from 'url';

export class ProxyRequestHandler {
    private connectionClient: typeof http | typeof https;
    private proxyUrl: URL;
    private proxyAuth;
    private req: http.IncomingMessage;
    private res: http.ServerResponse<http.IncomingMessage> & {
        req: http.IncomingMessage;
    };

    constructor({ proxyUrl, proxyAuth, req, res }) {
        const url = new URL(proxyUrl);

        if (!url) {
            throw new Error('no protocol url')
        }

        this.proxyUrl = url;
        this.proxyAuth = proxyAuth;
        this.req = req;
        this.res = res;
        this.connectionClient = this.proxyUrl.protocol === 'https:' ? https : http;
    }

    onRequest() {
        const headers = {
            ...this.addProxyAuthToHeaders(this.proxyAuth.username, this.proxyAuth.password),
            'Host': this.req.url!.split(':')[0],  // Target host fix type
        };

        const options = {
            method: this.req.method,
            hostname: this.proxyUrl.hostname,
            port: this.proxyUrl.port || (this.proxyUrl.protocol === 'https:' ? 443 : 80),
            path: this.req.url,
            headers: headers,
            rejectUnauthorized: false
        };


        const proxyRequest = this.connectionClient.request(options);

        proxyRequest.once('response', (proxyResponse) => {

            if (!proxyResponse.statusCode) {
                throw new Error('INVALID REQUEST')
            }

            this.res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
            proxyResponse.pipe(this.res);
        })

        proxyRequest.on('error', (err) => {
            console.error('Request error:', err);
            this.res.statusCode = 502;
            this.res.end('Proxy request failed');
        });

        this.req.on('error', () => {
            console.error('Http connection Aborted by client');
            proxyRequest.destroy();
            this.req.destroy();
        })

        this.req.pipe(proxyRequest);

    }

    addProxyAuthToHeaders(username: string, password: string) {
        delete this.req.headers['Proxy-Authorization']
        delete this.req.headers['proxy-authorization']

        return { ...this.req.headers, 'proxy-authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` }
    }
}