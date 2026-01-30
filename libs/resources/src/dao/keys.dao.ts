import { Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';
import { TRACKED_ERROR_STATUS_CODES } from '../constants/api.constants';

/**
 * Track API key error in the database
 *
 * Increments the error count for a key when it encounters rate limiting or forbidden responses.
 * Only tracks 403 (Forbidden) and 429 (Too Many Requests) status codes.
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @param accessToken - The access token to identify the key
 * @param statusCode - HTTP status code from the API response
 * @returns The updated KeysEntity or null if key not found or error not tracked
 *
 * @example
 * const updatedKey = await trackApiKeyError(keysRepository, token, 429);
 * if (updatedKey) {
 *   console.log(`Error tracked. New count: ${updatedKey.errorCounts}`);
 * }
 */
export async function trackApiKeyError(
  keysRepository: Repository<KeysEntity>,
  accessToken: string,
  statusCode: number,
): Promise<KeysEntity | null> {
  // Only track errors for specific status codes
  if (!TRACKED_ERROR_STATUS_CODES.has(statusCode)) {
    return null;
  }

  // Find the key entity by accessToken
  const keyEntity = await keysRepository.findOneBy({
    token: accessToken,
  });

  if (!keyEntity) {
    return null;
  }

  // Increment error count
  keyEntity.errorCounts += 1;

  // Save updated entity
  const updatedEntity = await keysRepository.save(keyEntity);

  return updatedEntity;
}

/**
 * Get a single API key by clearance tag
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @param clearance - The clearance tag to filter by
 * @returns The first KeysEntity matching the clearance tag, or null if not found
 */
export async function getKey(
  keysRepository: Repository<KeysEntity>,
  clearance: string,
): Promise<KeysEntity | null> {
  return keysRepository.findOne({
    where: { tags: clearance },
  });
}

/**
 * Get multiple API keys by clearance tag
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @param clearance - The clearance tag to filter by
 * @param isActive - Optional filter for active keys (default: true)
 * @param isValid - Optional filter for valid keys (default: true)
 * @returns Array of KeysEntity matching the clearance tag
 */
export async function getKeys(
  keysRepository: Repository<KeysEntity>,
  clearance: string,
  isActive?: boolean,
  isValid?: boolean,
): Promise<KeysEntity[]> {
  const query = keysRepository.createQueryBuilder('keys');

  query.where('keys.tags = :clearance', { clearance });

  if (isActive !== undefined) {
    query.andWhere('keys.status = :status', {
      status: isActive ? 'active' : 'inactive',
    });
  }

  if (isValid !== undefined) {
    query.andWhere('keys.status = :validStatus', {
      validStatus: isValid ? 'valid' : 'invalid',
    });
  }

  return query.getMany();
}

/**
 * Get a random API key by clearance tag
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @param clearance - The clearance tag to filter by
 * @returns A random KeysEntity matching the clearance tag, or null if not found
 */
export async function getRandomProxy(
  keysRepository: Repository<KeysEntity>,
  clearance?: string,
): Promise<KeysEntity | null> {
  const query = keysRepository.createQueryBuilder('keys');

  if (clearance) {
    query.where('keys.tags = :clearance', { clearance });
  }

  query.orderBy('RANDOM()').take(1);

  return query.getOne() || null;
}
