import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 10 }); // Adjust concurrency based on your server's capabilities
export function addToQueue<T>(fn: () => Promise<T>): Promise<T> {
  return queue.add(fn) as Promise<T>;
}