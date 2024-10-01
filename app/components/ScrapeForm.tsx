"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

type Tweet = {
  date: string;
  content: string;
  profile: string;
  url: string;
};

const ScrapeForm = () => {
  const [cookie, setCookie] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [tweetCount, setTweetCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    totalTweets: number;
    mostCommonWords: string[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTweets([]);
    setAnalytics(null);

    try {
      console.log("Sending scrape request...");
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cookie, hashtag, tweetCount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch tweets");
      }

      console.log("Received response from server");
      const data = await response.json();
      console.log(`Received ${data.tweets.length} tweets`, data.tweets); // Log the tweets received
      setTweets(data.tweets);

      // Analytics
      const wordCounts: { [key: string]: number } = {};
      data.tweets.forEach((tweet: Tweet) => {
        if (tweet && tweet.content) {
          // Check if tweet and content exist
          tweet.content.split(/\s+/).forEach((word) => {
            const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanWord && cleanWord.length > 2) {
              wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
            }
          });
        }
      });
      const mostCommonWords = Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);

      setAnalytics({ totalTweets: data.tweets.length, mostCommonWords });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setError(errorMessage);
      console.error("Error scraping tweets:", error);
    }

    setLoading(false);
  };

  const downloadCSV = () => {
    const csvContent = [
      ["Date", "Content", "Profile", "URL"],
      ...tweets.map((tweet) => [
        tweet.date,
        `"${tweet.content.replace(/"/g, '""')}"`,
        tweet.profile,
        tweet.url,
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${hashtag}_tweets.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-100 shadow-lg rounded-md">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
        Twitter Hashtag Scraper
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cookie" className="block font-medium text-gray-700">
            Twitter Cookie
          </label>
          <input
            id="cookie"
            type="text"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            placeholder="Your Twitter Cookie"
            required
          />
        </div>

        <div>
          <label htmlFor="hashtag" className="block font-medium text-gray-700">
            Hashtag
          </label>
          <input
            id="hashtag"
            type="text"
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            placeholder="#example"
            required
          />
        </div>

        <div>
          <label
            htmlFor="tweetCount"
            className="block font-medium text-gray-700"
          >
            Number of Tweets to Scrape
          </label>
          <input
            id="tweetCount"
            type="number"
            value={tweetCount}
            onChange={(e) => setTweetCount(Number(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            min="1"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
          disabled={loading}
        >
          {loading ? <Spinner /> : "Scrape Tweets"}
        </Button>
      </form>

      {loading && (
        <div className="mt-4 text-center">
          <Spinner />
          <p className="mt-2">
            Scraping tweets... This may take a few minutes.
          </p>
        </div>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {tweets.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Scraped Tweets
          </h2>
          <Table className="min-w-full table-auto bg-white shadow-md rounded-md">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Content</th>
                <th className="px-4 py-2">Profile</th>
                <th className="px-4 py-2">URL</th>
              </tr>
            </thead>
            <tbody>
              {tweets.map(
                (tweet, index) =>
                  tweet ? ( // Check if tweet is not null or undefined
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="border px-4 py-2">{tweet.date}</td>
                      <td className="border px-4 py-2">{tweet.content}</td>
                      <td className="border px-4 py-2">{tweet.profile}</td>
                      <td className="border px-4 py-2">
                        <a
                          href={tweet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          View Tweet
                        </a>
                      </td>
                    </tr>
                  ) : null // Render nothing if tweet is null
              )}
            </tbody>
          </Table>

          <Button
            onClick={downloadCSV}
            className="mt-4 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
          >
            Download CSV
          </Button>

          {analytics && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold">Analytics</h3>
              <p>Total Tweets Scraped: {analytics.totalTweets}</p>
              <p>Most Common Words: {analytics.mostCommonWords.join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScrapeForm;
