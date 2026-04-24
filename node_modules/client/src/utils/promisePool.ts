export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency = 3
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let current = 0;

  async function worker() {
    while (current < tasks.length) {
      const index = current++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
