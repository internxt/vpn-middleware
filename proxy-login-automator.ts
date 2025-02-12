import * as net from 'net';
import * as tls from 'tls';
const HTTPParser = require("http-parser-js").HTTPParser;
import { config } from 'dotenv';
import { HeaderTransform } from './header-transform';

config();

const VPN_SERVER_URL = process.env.VPN_SERVER_URL;
const VPN_SERVER_PORT = process.env.VPN_SERVER_PORT;
const VPN_USERNAME = process.env.VPN_USERNAME;
const VPN_PASSWORD = process.env.VPN_PASSWORD;
const IGNORE_HTTP_CERTS = process.env.IGNORE_HTTP_CERTS;
const IS_REMOTE_HTTPS = true


const createPortForwarder = (local_host, local_port, remote_host, remote_port, buf_proxy_basic_auth, is_remote_https, ignore_https_cert) => {

  const requestStatus = {
    haveGotData: false,
    haveShownError: false,
  };

  const localProxyServer = net.createServer({ allowHalfOpen: true }, function (socket) {
    const tlsOptions = { port: remote_port, host: remote_host, rejectUnauthorized: !IGNORE_HTTP_CERTS };
    const remoteSocket = tls.connect(tlsOptions);

    const headerTransform = new HeaderTransform(buf_proxy_basic_auth);

    // Send data from remote (external vpn) to requester
    remoteSocket.pipe(socket)
    // Add authorization headers and send data from requester to remote.
    socket.pipe(headerTransform).pipe(remoteSocket);

    remoteSocket.once('data', () => {
      requestStatus.haveGotData = true;
    });
    remoteSocket.on('end', function () {
      socket.end();
      if (!requestStatus.haveGotData && !requestStatus.haveShownError) {
        console.error('[LocalProxy(:' + local_port + ')][Connection to ' + remote_host + ':' + remote_port + '] Error: ended by remote peer');
        requestStatus.haveShownError = true;
      }
    });
    remoteSocket.on('close', function () {
      socket.end();
      if (!requestStatus.haveGotData && !requestStatus.haveShownError) {
        console.error('[LocalProxy(:' + local_port + ')][Connection to ' + remote_host + ':' + remote_port + '] Error: reset by remote peer');
        requestStatus.haveShownError = true;
      }
    });
    remoteSocket.on('error', function (err) {
      console.error('[LocalProxy(:' + local_port + ')][Connection to ' + remote_host + ':' + remote_port + '] ' + err);
      requestStatus.haveShownError = true;
    });

    socket.on('end', cleanup);

    socket.on('close', cleanup);

    let socketCleanUp = false;

    socket.on('error', function (err) {
      if (!socketCleanUp) {
        console.error('[LocalProxy(:' + local_port + ')][Incoming connection] ' + err);
      }
    });

    function cleanup() {
      socketCleanUp = true;
      remoteSocket.end();
    }
  });

  localProxyServer.on('error', function (err) {
    console.error('[LocalProxy(:' + local_port + ')] ' + err);
    process.exit(1);
  });

  localProxyServer.listen(local_port, local_host === '*' ? undefined : local_host, function () {
    console.log('[LocalProxy(:' + local_port + ')] OK: forward http://' + local_host + ':' + local_port + ' to http' + (is_remote_https ? 's' : '') + '://' + remote_host + ':' + remote_port);
  });
}

function main() {
  const basicAuth = Buffer.from('Proxy-Authorization: Basic ' + Buffer.from(VPN_USERNAME + ':' + VPN_PASSWORD).toString('base64'));

  createPortForwarder('localhost', 8081, VPN_SERVER_URL, VPN_SERVER_PORT, basicAuth, IS_REMOTE_HTTPS, IGNORE_HTTP_CERTS);
}

main();


