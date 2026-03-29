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
  return Array.isArray(array) && Boolean(array.length);
};

const LOCALE_KEYS = [
  'en_US',
  'es_MX',
  'pt_BR',
  'de_DE',
  'en_GB',
  'es_ES',
  'fr_FR',
  'it_IT',
  'ru_RU',
  'ko_KR',
  'zh_TW',
  'zh_CN',
] as const;

export const isLocaleObjectString = (value: unknown): boolean => {
  if (typeof value !== 'string' || (!value.startsWith('{') && !value.includes('en_'))) return false;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && LOCALE_KEYS.some((key) => key in parsed);
  } catch {
    return false;
  }
};

export const normalizeRealmName = (realmName: unknown): string => {
  if (typeof realmName === 'string' && isLocaleObjectString(realmName)) {
    try {
      const parsed = JSON.parse(realmName);
      return parsed.en_GB ?? parsed.en_US ?? Object.values(parsed)[0] ?? realmName;
    } catch {
      return realmName;
    }
  }
  return typeof realmName === 'string' ? realmName : String(realmName ?? '');
};

export const normalizeLocaleField = (value: unknown): string | null => {
  if (value == null) return null;

  if (typeof value === 'string') {
    if (isLocaleObjectString(value)) {
      try {
        const parsed = JSON.parse(value);
        return parsed.en_GB ?? parsed.en_US ?? Object.values(parsed).find((v) => typeof v === 'string') ?? null;
      } catch {
        return value;
      }
    }
    return value;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (LOCALE_KEYS.some((key) => key in obj)) {
      const result = obj.en_GB ?? obj.en_US ?? Object.values(obj).find((v) => typeof v === 'string');
      return typeof result === 'string' ? result : null;
    }
  }

  return null;
};
