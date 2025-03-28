export default () => ({
  environment: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT) || 3000,
  proxyPort: parseInt(process.env.PROXY_PORT) || 8082,
  database: {
    host: process.env.DB_HOSTNAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    debug: process.env.RDS_DEBUG === 'true' || false,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  redis: {
    connectionString: process.env.REDIS_CONNECTION_STRING,
  },
  secrets: {
    jwt: process.env.JWT_SECRET,
    gateway: process.env.GATEWAY_SECRET,
  },
  vpns: {
    FR: {
      address: process.env.FR_VPN_SERVER_URL,
      username: process.env.FR_VPN_USERNAME,
      pass: process.env.FR_VPN_PASSWORD,
    },
    PL: {
      address: process.env.PL_VPN_SERVER_URL,
      username: process.env.PL_VPN_USERNAME,
      pass: process.env.PL_VPN_PASSWORD,
    },
    CA: {
      address: process.env.CA_VPN_SERVER_URL,
      username: process.env.CA_VPN_USERNAME,
      pass: process.env.CA_VPN_PASSWORD,
    },
    DE: {
      address: process.env.DE_VPN_SERVER_URL,
      username: process.env.DE_VPN_USERNAME,
      pass: process.env.DE_VPN_PASSWORD,
    },
    UK: {
      address: process.env.UK_VPN_SERVER_URL,
      username: process.env.UK_VPN_USERNAME,
      pass: process.env.UK_VPN_PASSWORD,
    },
  },
});
