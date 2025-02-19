export default () => ({
  environment: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT) || 3000,
  database: {
    host: process.env.DB_HOSTNAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    debug: process.env.RDS_DEBUG === 'true' || false,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
    /* OTHER_ZONES: {
      address: '',
      username: '',
      pass: '',
    }, */
  },
});
