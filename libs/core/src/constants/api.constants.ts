import {
  API_HEADERS_ENUM, ApiConstParams,
  DMA_TIMEOUT_TOLERANCE, getRandomProxy,
  OSINT_TIMEOUT_TOLERANCE,
} from '@app/core';

export enum TOLERANCE_ENUM {
  DMA = DMA_TIMEOUT_TOLERANCE,
  OSINT = OSINT_TIMEOUT_TOLERANCE,
}

export enum KEY_STATUS {
  FREE = 'FREE',
  TAKEN = 'TAKEN',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

export const KEY_LOCK_ERRORS_NUM = 200;

export const apiConstParams = (
  header: API_HEADERS_ENUM,
  tolerance: TOLERANCE_ENUM = TOLERANCE_ENUM.OSINT,
  isMultiLocale?: boolean,
  ifModifiedSince?: string,
) => ({
  params: isMultiLocale ? {} : { locale: 'en_GB' },
  headers: ifModifiedSince
    ? {
        'Battlenet-Namespace': header,
        'If-Modified-Since': ifModifiedSince,
      }
    : {
        'Battlenet-Namespace': header,
      },
  timeout: tolerance,
});
