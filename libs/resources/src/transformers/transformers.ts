import { BlizzardApiNamedField, ConvertPrice, FACTION } from '@app/resources/index';
import { TransformFnParams } from 'class-transformer';
import { DateTime } from 'luxon';

/**
 * Converts a string to kebab-case format.
 *
 * @param s - The input string to convert
 * @returns The kebab-cased string
 * @example kebabCase('HelloWorld') // returns 'hello-world'
 */
const kebabCase = (s: string): string =>
  s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

/**
 * Generates a GUID from a character name and realm.
 *
 * @param name - The character name
 * @param realm - The realm name
 * @returns A kebab-cased GUID in the format "name@realm"
 * @example toGuid('PlayerName', 'RealmName') // returns 'player-name@realm-name'
 */
export const toGuid = (name: string, realm: string): string =>
  kebabCase(`${name}@${realm}`);

/**
 * Capitalizes the first letter of a string.
 *
 * @param s - The input string
 * @returns The string with the first letter capitalized
 * @example capitalize('hello') // returns 'Hello'
 */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Converts a slug to a human-readable format with the first letter capitalized
 * and dashes replaced with spaces.
 *
 * @param s - The slug string
 * @returns A formatted string
 * @example fromSlug('hello-world') // returns 'Hello world'
 */
export const fromSlug = (s: string): string =>
  s.toString().charAt(0).toUpperCase() + s.slice(1).replace(/-+/g, ' ');

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param n - The number to round
 * @param digits - The number of decimal places (default: 2)
 * @returns The rounded number
 * @example round(3.14159, 2) // returns 3.14
 */
export const round = (n: number, digits = 2): number =>
  parseFloat(n.toFixed(digits));

/**
 * Converts copper currency to gold by dividing by 10000.
 *
 * @param n - The copper amount
 * @param digits - The number of decimal places (default: 2)
 * @returns The gold amount
 * @example toGold(50000) // returns 5.00
 */
export const toGold = (n: number, digits = 2): number =>
  parseFloat((n / 10000).toFixed(digits));

/**
 * Converts a string to slug format (kebab-case).
 *
 * @param s - The input string
 * @returns A slug-formatted string
 * @example toSlug('Hello World') // returns 'hello-world'
 */
export const toSlug = (s: string): string => kebabCase(s);

/**
 * Converts a string to a lowercase key format with underscores.
 *
 * @param s - The input string
 * @returns A lowercase string with underscores instead of spaces
 * @example toKey("Hello World's") // returns 'hello_worlds'
 */
export const toKey = (s: string): string =>
  s.replace(/\s+/g, '_').replace(/'+/g, '').toLowerCase();

/**
 * Converts a locale string from 'enUS' format to 'en_US' format.
 *
 * @param s - The locale string
 * @returns The formatted locale string
 * @example toLocale('enUS') // returns 'en_US'
 */
export const toLocale = (s: string): string => s.substr(0, 2) + '_' + s.substr(2);

/**
 * Converts various date formats to a JavaScript Date object.
 *
 * @param lastModified - The date value (Date, RFC2822 string, or timestamp)
 * @returns A valid Date object or a default date if parsing fails
 * @example toDate(1234567890000) // returns Date object
 */
export const toDate = (lastModified: unknown): Date => {
  if (lastModified instanceof Date) {
    return lastModified;
  }

  if (
    typeof lastModified === 'string' &&
    DateTime.fromRFC2822(lastModified).isValid
  ) {
    return DateTime.fromRFC2822(lastModified).toJSDate();
  }

  if (
    typeof lastModified === 'number' &&
    DateTime.fromMillis(lastModified).isValid
  ) {
    return DateTime.fromMillis(lastModified).toJSDate();
  }

  return new Date('1999-09-11T20:00:30');
};

/**
 * Converts a value to either a string or number.
 * Returns the number if the value can be parsed as a number, otherwise returns the original value.
 *
 * @param value - The value to convert
 * @returns Either the parsed number or the original value
 * @example toStringOrNumber('123') // returns 123
 * @example toStringOrNumber('abc') // returns 'abc'
 */
export const toStringOrNumber = (value: string | number): string | number =>
  Number.isNaN(Number(value)) ? value : Number(value);

/**
 * Type guard to filter out null and undefined values.
 *
 * @param value - The value to check
 * @returns True if the value is not null or undefined
 * @example [1, null, 2, undefined].filter(notNull) // returns [1, 2]
 */
export const notNull = <T>(value: T | null | undefined): value is T => value != null;

/**
 * Transforms a named field value or extracts a specific key from an object.
 *
 * @param value - The input value or object
 * @param key - The key to extract from the object (default: 'name')
 * @returns The extracted value, parsed as number if applicable, or null
 * @example transformNamedField({ name: '123' }, 'name') // returns 123
 */
export const transformNamedField = <T extends object>(
  value: T,
  key = 'name',
): string | number | T | null => {
  if (!value) {
    return null;
  }

  const isNamed = typeof value === 'object' && key in value;
  const isString = isNamed
    ? typeof value[key] === 'string'
    : typeof value === 'string';
  const isNumber = isNamed
    ? typeof value[key] === 'number'
    : typeof value === 'number';

  if (isNamed && (isString || isNumber)) {
    return isNaN(value[key]) ? value[key] : parseInt(value[key]);
  }

  if (isNamed) {
    return value[key] || null;
  }

  return value;
};

/**
 * Checks if an object has a 'name' property.
 *
 * @param value - The value to check
 * @returns True if the value is an object with a 'name' property
 * @example isFieldNamed({ name: 'test' }) // returns true
 */
export const isFieldNamed = <T extends object>(value: T): boolean => {
  return typeof value === 'object' && 'name' in value;
};

/**
 * Extracts the connected realm ID from a Blizzard API response object.
 *
 * @param value - The object containing connected realm information
 * @returns The extracted realm ID or null if not found
 * @example transformConnectedRealmId({ connected_realm: { href: 'api/realm/1234' } }) // returns 1234
 */
export const transformConnectedRealmId = <T extends object>(
  value: T,
): number | null => {
  const hasHref = value && 'connected_realm' in value;
  if (!hasHref) {
    return null;
  }

  const { href } = value.connected_realm as BlizzardApiNamedField;

  const connectedRealmId = parseInt((href as string).replace(/\D/g, ''));
  const isValidConnectedRealmId = connectedRealmId && !isNaN(connectedRealmId);

  if (!isValidConnectedRealmId) {
    return null;
  }

  return connectedRealmId;
};

/**
 * Transforms price data from copper to gold, checking multiple price fields.
 *
 * @param order - The order object containing price information
 * @returns The price in gold or undefined if no price is found
 * @example transformPrice({ unit_price: 50000 }) // returns 5.00
 */
export const transformPrice = (order: ConvertPrice): number | undefined => {
  if (order.unit_price) {
    return toGold(order.unit_price);
  }

  if (order.buyout) {
    return toGold(order.buyout);
  }

  if (order.bid) {
    return toGold(order.bid);
  }

  return undefined;
};

/**
 * Extracts the realm name from a filename with a specific pattern.
 *
 * @param filename - The filename to parse
 * @returns The extracted realm name or null if not found
 * @example extractRealmName('eu_silvermoon_tier') // returns 'silvermoon'
 */
export const extractRealmName = (filename: string): string | null => {
  const match = filename.match(/eu_(.+?)_tier/);
  return match ? match[1] : null;
};

/**
 * Transforms a value to lowercase string for class-transformer.
 * Used as a class-transformer custom transformer.
 *
 * @param params - The transform function parameters from class-transformer
 * @returns The lowercase string or undefined if value is invalid
 * @example transformToLowerCase({ value: 'HELLO' }) // returns 'hello'
 */
export function transformToLowerCase(params: TransformFnParams): string | undefined {
  const { value } = params;

  if (!value) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const lowerCased = value.toLowerCase();
  return lowerCased.length > 0 ? lowerCased : undefined;
}

/**
 * Transforms a search query by trimming and converting to lowercase.
 * Used as a class-transformer custom transformer.
 *
 * @param params - The transform function parameters from class-transformer
 * @returns The trimmed and lowercase string or undefined if value is invalid
 * @example transformSearchQuery({ value: '  Hello World  ' }) // returns 'hello world'
 */
export function transformSearchQuery(params: TransformFnParams): string | undefined {
  const { value } = params;

  if (!value) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.toLowerCase();
}

/**
 * Transforms a value to a trimmed string.
 * Used as a class-transformer custom transformer.
 *
 * @param params - The transform function parameters from class-transformer
 * @returns The trimmed string or undefined if value is invalid or empty
 * @example transformToTrimmedString({ value: '  hello  ' }) // returns 'hello'
 */
export function transformToTrimmedString(
  params: TransformFnParams,
): string | undefined {
  const { value } = params;

  if (!value) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function transformFaction(faction: unknown): FACTION | null {
  const isFactionObject = typeof faction === 'object' && faction !== null;

  if (!isFactionObject) {
    return null;
  }

  const factionObject = faction as { type?: string | null; name?: string | null };

  const hasFactionTypeWithoutName =
    factionObject.type && factionObject.name === null;
  if (hasFactionTypeWithoutName) {
    const typeUpper = factionObject.type.toString().toUpperCase();
    const validFactions = Object.values(FACTION).filter((f) => f !== FACTION.ANY);
    const matchedFaction = validFactions.find(
      (f) => f.toString().toUpperCase() === typeUpper,
    );
    return matchedFaction || null;
  }

  if (factionObject.name) {
    const nameUpper = factionObject.name.toUpperCase();
    const validFactions = Object.values(FACTION).filter((f) => f !== FACTION.ANY);
    const matchedFaction = validFactions.find(
      (f) => f.toString().toUpperCase() === nameUpper,
    );
    return matchedFaction || null;
  }

  return null;
}
