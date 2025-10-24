import { ICmnwConfig } from '@app/configuration/interfaces';

export const cmnwConfig: ICmnwConfig = {
  clientId: process.env.BATTLENET_CLIENT_ID,
  clientSecret: process.env.BATTLENET_CLIENT_SECRET,
  redirectUri: process.env.BATTLENET_CALLBACK_URL,
  port: Number(process.env.CMNW_PORT),
  origin: [process.env.CMNW_ORIGIN],
};
