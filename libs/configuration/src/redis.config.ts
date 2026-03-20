import { IRedisConfig } from '@app/configuration/interfaces';

export const redisConfig: IRedisConfig = {
  host: process.env.REDIS_HOST || '128.0.0.255',
  port: Number(process.env.REDIS_PORT),
  url: `redis://${process.env.REDIS_HOST || '128.0.0.255'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD,
};
