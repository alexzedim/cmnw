import { defer, forkJoin, from, lastValueFrom, of, timer } from 'rxjs';
import { bufferCount, catchError, concatMap, map, mergeMap, tap } from 'rxjs/operators';

export const limitConcurrency = <T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  limit: number,
): Promise<{ [K in keyof T]: PromiseSettledResult<Awaited<ReturnType<T[K]>>> }> => {
  return new Promise((resolve) => {
    const results: PromiseSettledResult<unknown>[] = new Array(tasks.length);
    let completed = 0;
    let currentIndex = 0;

    const runNext = async (): Promise<void> => {
      if (currentIndex >= tasks.length) return;

      const index = currentIndex++;
      try {
        const value = await tasks[index]();
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
      completed++;

      if (completed === tasks.length) {
        resolve(results as { [K in keyof T]: PromiseSettledResult<Awaited<ReturnType<T[K]>>> });
      } else {
        void runNext();
      }
    };

    for (let i = 0; i < Math.min(limit, tasks.length); i++) {
      void runNext();
    }
  });
};

/**
 * Promise.allSettled equivalent that executes thunks in sequential batches of
 * `batchSize`, waiting `batchDelayMs` before each subsequent batch, so requests
 * are paced instead of all leaving at once.
 */
export const batchedAllSettled = async <T extends readonly (() => Promise<unknown>)[]>(
  factories: T,
  batchSize: number,
  batchDelayMs: number,
): Promise<{ [K in keyof T]: PromiseSettledResult<Awaited<ReturnType<T[K]>>> }> => {
  const results: PromiseSettledResult<unknown>[] = new Array(factories.length);

  await lastValueFrom(
    from(factories).pipe(
      map((factory, index) => ({ factory, index })),
      bufferCount(batchSize),
      concatMap((batch, batchIndex) =>
        (batchIndex === 0 ? of(batch) : timer(batchDelayMs).pipe(map(() => batch))).pipe(
          mergeMap((delayedBatch) =>
            forkJoin(
              delayedBatch.map(({ factory, index }) =>
                defer(factory).pipe(
                  map((value) => ({ status: 'fulfilled', value }) as PromiseSettledResult<unknown>),
                  catchError((reason: unknown) => of({ status: 'rejected', reason } as PromiseSettledResult<unknown>)),
                  tap((result) => {
                    results[index] = result;
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    { defaultValue: undefined },
  );

  return results as { [K in keyof T]: PromiseSettledResult<Awaited<ReturnType<T[K]>>> };
};
