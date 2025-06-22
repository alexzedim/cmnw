import { S3Config } from '@app/configuration';

export const s3Config: S3Config = {
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: process.env.S3_REGION,
  endpoint: process.env.S3_HOST,
  forcePathStyle: true,
};
