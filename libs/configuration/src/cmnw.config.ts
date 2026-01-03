import { ICmnwConfig } from '@app/configuration/interfaces';

export const cmnwConfig: ICmnwConfig = {
  port: Number(process.env.CMNW_PORT) || 8080,
  clientId: process.env.BATTLENET_CLIENT_ID,
  clientSecret: process.env.BATTLENET_CLIENT_SECRET,
  callbackUrl: process.env.BATTLENET_CALLBACK_URL,
  cors: {
    origins: [],
    allowCredentials: true,
  },
};
