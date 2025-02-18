import http from 'http';
import https from "https";
import { Duplex } from 'stream';
import { URL } from 'url';

export class ProxyConnectHandler {
    private connectionClient: typeof http | typeof https;
    private proxyUrl: URL;
    private clientSocket: Duplex;
    private proxyAuth;
    private req: http.IncomingMessage;


    constructor({ proxyUrl, proxyAuth, clientSocket, req }) {
        const url = new URL(proxyUrl);

        if (!url) {
            throw new Error('no protocol url')
        }

        this.proxyUrl = url;
        this.proxyAuth = proxyAuth;
        this.clientSocket = clientSocket;
        this.req = req;
        this.connectionClient = this.proxyUrl.protocol === 'https:' ? https : http;
    }

    onConnect() {
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

        proxyRequest.on('connect', (proxyRes, proxySocket) => {
            this.clientSocket.write("HTTP/1.1 200 OK\r\n\r\n");
            this.clientSocket.pipe(proxySocket);
            proxySocket.pipe(this.clientSocket);
        });

        proxyRequest.on('error', (err) => {
            console.error('CONNECT error:', err);
            this.clientSocket.end('Error connecting through proxy');
        })

        proxyRequest.end();

        this.clientSocket.on('error', () => {
            console.error('Connection Aborted by client');
            proxyRequest.destroy();
            this.clientSocket.destroy();
        })
    }

    onResponse(res) {
        res.upgrade = true;
    }

    addProxyAuthToHeaders(username: string, password: string) {
        delete this.req.headers['Proxy-Authorization']
        delete this.req.headers['proxy-authorization']

        return { ...this.req.headers, 'proxy-authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` }
    }
}