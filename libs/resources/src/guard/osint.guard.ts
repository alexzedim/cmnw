import { WowProgressJson } from '@app/resources/types';

export const isWowProgressJson = (obj: unknown): obj is WowProgressJson => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).url === 'string'
  );
};

export const isValidArray = (array: unknown): array is Array<unknown> => {
  return (
    Array.isArray(array) &&
    Boolean(array.length)
  )
}
