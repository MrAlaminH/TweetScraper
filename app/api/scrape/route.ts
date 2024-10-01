import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { Tweet } from '../../../lib/types';

type ScrapeRequest = {
  cookie: string;
  hashtag: string;
  tweetCount: number;
};

const randomDelay = (min: number, max: number) => {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
};

// Modify scrapeTweets to avoid duplicates
async function scrapeTweets(cookie: string, hashtag: string, countPerInstance: number, instanceNum: number, seenUrls: Set<string>) {
  const tweets: Tweet[] = [];
  const browser = await puppeteer.launch({ headless: 'shell' });
  const page = await browser.newPage();
  await page.setCookie({ name: 'auth_token', value: cookie, domain: '.twitter.com' });

  console.log(`Instance ${instanceNum}: Navigating to Twitter search page for hashtag: ${hashtag}`);
  await page.goto(`https://twitter.com/search?q=${encodeURIComponent(hashtag)}&src=typed_query&f=live`, {
    waitUntil: 'networkidle2',
  });

  let totalTweets = 0;
  let attempts = 0;
  const maxAttempts = 10;

  while (totalTweets < countPerInstance && attempts < maxAttempts) {
    console.log(`Instance ${instanceNum}: Scraping tweets...`);

    const newTweets = await page.evaluate(() => {
      const tweetData: Tweet[] = [];
      const tweetElements = document.querySelectorAll('article');

      tweetElements.forEach((tweet) => {
        const content = tweet.querySelector('div[lang]')?.textContent || '';
        const profileElement = tweet.querySelector('div[data-testid="User-Name"] a');
        const urlElement = tweet.querySelector('a[href*="/status/"]');
        const date = tweet.querySelector('time')?.getAttribute('datetime') || '';

        const profile = profileElement?.getAttribute('href') ? `https://twitter.com${profileElement.getAttribute('href')}` : '';
        const url = urlElement?.getAttribute('href') ? `https://twitter.com${urlElement.getAttribute('href')}` : '';

        if (content && profile && url && date) {
          tweetData.push({ content, profile, url, date });
        }
      });

      return tweetData;
    });

    // Filter out duplicate tweets by checking their URLs
    const uniqueTweets = newTweets.filter(tweet => !seenUrls.has(tweet.url));
    
    // Add the new unique tweets to the Set of seen URLs
    uniqueTweets.forEach(tweet => seenUrls.add(tweet.url));

    tweets.push(...uniqueTweets);
    totalTweets = tweets.length;

    if (totalTweets < countPerInstance) {
      console.log(`Instance ${instanceNum}: Scrolling to load more tweets...`);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await randomDelay(2000, 5000);
    }

    attempts++;
  }

  await browser.close();
  console.log(`Instance ${instanceNum}: Scraping completed. Total unique tweets scraped: ${tweets.length}`);
  return tweets.slice(0, countPerInstance);
}

export async function POST(req: NextRequest) {
  const { cookie, hashtag, tweetCount }: ScrapeRequest = await req.json();

  if (!cookie || !hashtag || !tweetCount) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  try {
    const parallelInstances = 5; // Number of parallel browser instances
    const countPerInstance = Math.ceil(tweetCount / parallelInstances); // Tweets per browser instance

    console.log(`Starting parallel scraping with ${parallelInstances} instances...`);

    // A Set to track URLs of the scraped tweets to avoid duplicates
    const seenUrls = new Set<string>();

    // Create an array of promises to scrape in parallel
    const scrapingPromises = Array.from({ length: parallelInstances }, (_, i) => 
      scrapeTweets(cookie, hashtag, countPerInstance, i + 1, seenUrls)
    );

    // Run all instances concurrently and gather the results
    const results = await Promise.all(scrapingPromises);

    // Flatten the array of arrays into one array of tweets
    const allTweets = results.flat();

    // Limit the total number of tweets to the requested tweet count
    const limitedTweets = allTweets.slice(0, tweetCount);

    console.log(`Scraping completed. Total unique tweets scraped: ${limitedTweets.length}`);
    return NextResponse.json({ tweets: limitedTweets });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Failed to scrape tweets.' }, { status: 500 });
  }
}

