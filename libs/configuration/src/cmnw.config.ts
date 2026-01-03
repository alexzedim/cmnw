import { ICmnwConfig } from '@app/configuration/interfaces';

const allowedOrigins: string[] = [
  'https://cmnw.me',
  'https://api.cmnw.me',
  'https://www.cmnw.me',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
];

export const cmnwConfig: ICmnwConfig = {
  port: Number(process.env.CMNW_PORT) || 8080,
  clientId: process.env.BATTLENET_CLIENT_ID,
  clientSecret: process.env.BATTLENET_CLIENT_SECRET,
  callbackUrl: process.env.BATTLENET_CALLBACK_URL,
  cors: {
    origins: allowedOrigins,
    allowCredentials: true,
  },
};
