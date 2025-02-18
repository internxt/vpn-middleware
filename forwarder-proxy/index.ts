import http from 'http';
import { ProxyConnectHandler } from './method-handlers/connect-handler';
import { ProxyRequestHandler } from './method-handlers/request-handler';
import { verify } from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const proxyList = [
  { url: 'xxxxxx', auth: { username: 'xxx', password: 'xxxx' } }, // Basic auth example
];

const getTokenFromHeaders = (headers: http.IncomingHttpHeaders) => {
  return headers['proxy-authorization'] || '';
}

const verifyToken = (token: string) => {
  const object = { token: token, zone: 'FR' }
  const tokenBuffer = Buffer.from(JSON.stringify(object)).toString('base64');
  const tokenObject = JSON.parse(Buffer.from(tokenBuffer, 'base64').toString('utf-8'));

  console.log(token, { tokenObject });
  try {
    const tokenData = verify(token, process.env.JWT_SECRET || '');
    return tokenData
  } catch (err) {
    console.error('[TOKEN_VALIDATOR]: Invalid token')
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const token = getTokenFromHeaders(req.headers)

  if (token && !verifyToken(token)) {
    res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="Proxy"' });
    res.end('407 Invalid token, proxy authentication required');
    return;
  }

  const connectionHandler = new ProxyRequestHandler({ proxyUrl: proxyList[0].url, proxyAuth: proxyList[0].auth, req, res })
  connectionHandler.onRequest()
});

server.on('connect', (req, socket, head) => {
  const connectionHandler = new ProxyConnectHandler({ proxyUrl: proxyList[0].url, proxyAuth: proxyList[0].auth, clientSocket: socket, req })
  connectionHandler.onConnect()
});

server.listen(8081, () => {
  console.log('Proxy server running on port 8081');
});
