import { ICmnwConfig } from '@app/configuration/interfaces';

export const cmnwConfig: ICmnwConfig = {
  port: Number(process.env.CMNW_PORT),
};
