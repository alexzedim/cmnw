import { IRedisConfig } from '@app/configuration/interfaces';

export const bullConfig: IRedisConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.BULL_PORT),
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
};
