import PQueue from 'p-queue';
import { Tweet } from '@/lib/types'; // Ensure you have a Tweet type defined

const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });

export async function scrapeWithRateLimit(fn: () => Promise<Tweet[]>): Promise<Tweet[]> {
  return await queue.add(fn) as Tweet[];
}