import { Repository } from 'typeorm';
import { KeysEntity } from '@app/pg';

/**
 * Get a single API key by clearance tag
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @param clearance - The clearance tag to filter by
 * @returns The first KeysEntity matching the clearance tag, or null if not found
 */
export async function getKey(keysRepository: Repository<KeysEntity>, clearance: string): Promise<KeysEntity | null> {
  return keysRepository.findOne({
    where: { tags: clearance },
  });
}

/**
 * Get multiple API keys by clearance tag
 *
 * @param keysRepository - TypeORM repository for KeysEntity
 * @param clearance - The clearance tag to filter by
 * @returns Array of KeysEntity matching the clearance tag
 */
export async function getKeys(keysRepository: Repository<KeysEntity>, clearance: string): Promise<KeysEntity[]> {
  return keysRepository.find({
    where: { tags: clearance },
  });
}
