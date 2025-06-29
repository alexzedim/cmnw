import { createCipheriv, createDecipheriv, randomInt } from 'crypto';
import { CIPHER_ALGO_AES } from '@app/resources/clearance';
import process from 'node:process';

export const encrypt = (sensitive: string) => {
  const key = Buffer.from(process.env.KEY);
  const cipher = createCipheriv(CIPHER_ALGO_AES, key, null);
  const encrypted = Buffer.from(
    cipher.update(sensitive, 'utf8', 'hex') + cipher.final('hex'),
  ).toString('base64');
  return `enc:${encrypted}`;
};

export const decrypt = (sensitiveEnc: string) => {
  if (!sensitiveEnc || process.env.NODE_ENV !== 'production') return sensitiveEnc;
  const key = Buffer.from(process.env.KEY);
  const [s, encryptedData] = sensitiveEnc.split(':');
  if (s !== 'enc') return sensitiveEnc;
  const buff = Buffer.from(encryptedData, 'base64');
  const decipher = createDecipheriv(CIPHER_ALGO_AES, key, null);
  return (decipher.update(buff.toString('utf8'), 'hex', 'utf8') + decipher.final('utf8'));
};

/**
 * @description Gives a random int number in-between requested values
 * @param min {number} Minimal number
 * @param max {number} Maximum number
 */
export const cryptoRandomIntBetween = (min: number, max: number) =>
  randomInt(min, max + 1);
