import express from 'express'
import jwt from 'jsonwebtoken'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { config } from 'dotenv'

config();

const app = express();
const port = 3001;
const JWT_SECRET = process.env.JWT_SECRET as string;
const VPN_SERVER_URL = process.env.VPN_SERVER_URL;
const VPN_SERVER_PORT = process.env.VPN_SERVER_PORT;

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).send();
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).send();
      }

      (req as any).user = user;
      next();
    });
  } catch (err) {

  }
});

const vpnProxy = createProxyMiddleware({
  target: `${VPN_SERVER_URL}:${VPN_SERVER_PORT}`,
  changeOrigin: true,
});

app.use(vpnProxy);

app.listen(port, () => {
  console.log(`Running on port :${port}`);
});
