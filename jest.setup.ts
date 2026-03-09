import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

// Mock chalk for tests (ESM module compatibility)
jest.mock('chalk', () => ({
  __esModule: true,
  default: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'default') return target;
      // Return a function that returns the string unchanged
      return (str: string) => str;
    }
  }),
  bold: (str: string) => str,
  dim: (str: string) => str,
  green: (str: string) => str,
  red: (str: string) => str,
  yellow: (str: string) => str,
  cyan: (str: string) => str,
  magenta: (str: string) => str,
  blue: (str: string) => str,
  white: (str: string) => str,
  gray: (str: string) => str,
  grey: (str: string) => str,
  greenBright: (str: string) => str,
  redBright: (str: string) => str,
  yellowBright: (str: string) => str,
  cyanBright: (str: string) => str,
  magentaBright: (str: string) => str,
  blueBright: (str: string) => str,
  whiteBright: (str: string) => str,
  bgRed: (str: string) => str,
  bgGreen: (str: string) => str,
  bgYellow: (str: string) => str,
  bgBlue: (str: string) => str,
  hex: () => (str: string) => str,
  rgb: () => (str: string) => str,
}));
