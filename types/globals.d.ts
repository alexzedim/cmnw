declare module 'uuid' {
  export function v1(): string;
  export function v3(name: string, namespace: string, buffer?: unknown, offset?: number): string;
  export function v4(): string;
  export function v5(name: string, namespace: string, buffer?: unknown, offset?: number): string;
  export const parse: (uuid: string) => Uint8Array;
  export const stringify: (arr: Uint8Array, offset?: number) => string;
  export const validate: (uuid: string) => boolean;
  export const version: (uuid: string) => number;
  export const NIL: string;
  export namespace v3 {
    const DNS: string;
    const URL: string;
  }
  export namespace v5 {
    const DNS: string;
    const URL: string;
  }
}

declare module 'change-case' {
  export function camelCase(input: string, options?: Record<string, unknown>): string;
  export function capitalCase(input: string, options?: Record<string, unknown>): string;
  export function constantCase(input: string, options?: Record<string, unknown>): string;
  export function dotCase(input: string, options?: Record<string, unknown>): string;
  export function headerCase(input: string, options?: Record<string, unknown>): string;
  export function noCase(input: string, options?: Record<string, unknown>): string;
  export function paramCase(input: string, options?: Record<string, unknown>): string;
  export function pascalCase(input: string, options?: Record<string, unknown>): string;
  export function pathCase(input: string, options?: Record<string, unknown>): string;
  export function sentenceCase(input: string, options?: Record<string, unknown>): string;
  export function snakeCase(input: string, options?: Record<string, unknown>): string;
}
