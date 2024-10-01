import puppeteer, { Browser } from 'puppeteer';
import pLimit from 'p-limit';

const MAX_CONCURRENT_BROWSERS = 10; // Adjust based on your server's capabilities
const browserPool: Browser[] = [];
const limit = pLimit(MAX_CONCURRENT_BROWSERS);

export async function getBrowser(): Promise<Browser> {
  if (browserPool.length > 0) {
    return browserPool.pop()!;
  }
  return puppeteer.launch({ headless: true });
}

export async function releaseBrowser(browser: Browser) {
  browserPool.push(browser);
}

export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  return limit(async () => {
    const browser = await getBrowser();
    try {
      return await fn(browser);
    } finally {
      await releaseBrowser(browser);
    }
  });
}