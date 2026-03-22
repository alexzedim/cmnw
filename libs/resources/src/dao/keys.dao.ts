import { Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';

/**
 * Get a single API key
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @returns A KeysEntity, or null if none exist
 */
export async function getKey(keysRepository: Repository<KeysEntity>): Promise<KeysEntity | null> {
  return keysRepository.findOne({});
}

/**
 * Get all API keys
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @returns Array of all KeysEntity
 */
export async function getKeys(keysRepository: Repository<KeysEntity>): Promise<KeysEntity[]> {
  return keysRepository.find({});
}
