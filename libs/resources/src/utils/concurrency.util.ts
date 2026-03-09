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
