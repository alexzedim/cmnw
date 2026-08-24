import { batchedAllSettled } from './concurrency.util';

type Deferred = {
  promise: Promise<unknown>;
  resolve: (value?: unknown) => void;
};

const createDeferred = (): Deferred => {
  let resolve!: (value?: unknown) => void;
  const promise = new Promise<unknown>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

/**
 * Unit tests for batchedAllSettled: Promise.allSettled semantics (order
 * preservation, rejection isolation) on top of strictly sequential batches
 * spaced by a delay, so Blizzard calls never leave as one burst.
 */
describe('batchedAllSettled', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs the first batch immediately and in parallel', async () => {
    const calls: number[] = [];
    const deferreds = [createDeferred(), createDeferred()];
    const factories = deferreds.map((deferred, index) => () => {
      calls.push(index);
      return deferred.promise;
    });

    void batchedAllSettled(factories, 2, 500);
    await Promise.resolve();

    expect(calls).toEqual([0, 1]);
  });

  it('waits for the whole previous batch plus the delay before the next one', async () => {
    const calls: number[] = [];
    const resolvers: Array<(value?: unknown) => void> = [];
    const factories = [0, 1, 2, 3, 4].map((index) => () => {
      calls.push(index);
      return new Promise<unknown>((resolve) => {
        resolvers[index] = resolve;
      });
    });

    const settled = batchedAllSettled(factories, 2, 500);
    await Promise.resolve();
    expect(calls).toEqual([0, 1]);

    resolvers[0]('a');
    await jest.advanceTimersByTimeAsync(500);
    expect(calls).toEqual([0, 1]);

    resolvers[1]('b');
    await jest.advanceTimersByTimeAsync(499);
    expect(calls).toEqual([0, 1]);

    await jest.advanceTimersByTimeAsync(1);
    expect(calls).toEqual([0, 1, 2, 3]);

    resolvers[2]('c');
    resolvers[3]('d');
    await jest.advanceTimersByTimeAsync(499);
    expect(calls).toEqual([0, 1, 2, 3]);

    await jest.advanceTimersByTimeAsync(1);
    expect(calls).toEqual([0, 1, 2, 3, 4]);

    resolvers[4]('e');
    const results = await settled;

    expect(results).toEqual([
      { status: 'fulfilled', value: 'a' },
      { status: 'fulfilled', value: 'b' },
      { status: 'fulfilled', value: 'c' },
      { status: 'fulfilled', value: 'd' },
      { status: 'fulfilled', value: 'e' },
    ]);
  });

  it('keeps results in input order regardless of completion order', async () => {
    const first = createDeferred();
    const second = createDeferred();
    const settled = batchedAllSettled([() => first.promise, () => second.promise], 2, 500);

    second.resolve('second-value');
    first.resolve('first-value');

    const results = await settled;
    expect(results).toEqual([
      { status: 'fulfilled', value: 'first-value' },
      { status: 'fulfilled', value: 'second-value' },
    ]);
  });

  it('isolates rejections without failing sibling requests', async () => {
    const factories = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('boom')),
      () => Promise.resolve('fine'),
    ];

    const results = await batchedAllSettled(factories, 3, 500);

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok' });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'fine' });
    expect(results[1].status).toBe('rejected');
    if (results[1].status === 'rejected') {
      expect(results[1].reason).toBeInstanceOf(Error);
      expect((results[1].reason as Error).message).toBe('boom');
    }
  });

  it('resolves an empty result set for empty input', async () => {
    const results = await batchedAllSettled([], 3, 500);
    expect(results).toEqual([]);
  });
});
