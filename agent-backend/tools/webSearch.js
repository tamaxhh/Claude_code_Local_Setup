/**
 * tools/webSearch.js
 * Searches the web using the Brave Search API (free tier: 2000 queries/month).
 * Falls back to DuckDuckGo instant answer API if no key is configured.
 *
 * Returns: Array of { title, url, snippet }
 */

const axios = require('axios');

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const DDG_ENDPOINT = 'https://api.duckduckgo.com/';

async function webSearch(query, maxResults = 5) {
    console.log(`[webSearch] Searching: "${query}"`);

    if (BRAVE_API_KEY) {
        return braveSearch(query, maxResults);
    }
    // Fallback to DDG (limited results, no API key needed)
    return ddgSearch(query);
}

async function braveSearch(query, maxResults) {
    try {
        const res = await axios.get(BRAVE_ENDPOINT, {
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': BRAVE_API_KEY,
            },
            params: { q: query, count: maxResults },
            timeout: 10000,
        });

        const webResults = res.data?.web?.results || [];
        return webResults.slice(0, maxResults).map((r) => ({
            title: r.title || '',
            url: r.url || '',
            snippet: r.description || '',
        }));
    } catch (err) {
        console.error('[webSearch] Brave API error:', err.message);
        return [{ error: `Brave search failed: ${err.message}` }];
    }
}

async function ddgSearch(query) {
    try {
        const res = await axios.get(DDG_ENDPOINT, {
            params: { q: query, format: 'json', no_redirect: 1, no_html: 1 },
            timeout: 10000,
        });

        const results = [];
        const data = res.data;

        // DDG instant answer
        if (data.AbstractText) {
            results.push({ title: data.Heading || query, url: data.AbstractURL || '', snippet: data.AbstractText });
        }

        // Related topics
        if (data.RelatedTopics) {
            for (const topic of data.RelatedTopics.slice(0, 4)) {
                if (topic.Text && topic.FirstURL) {
                    results.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, snippet: topic.Text });
                }
            }
        }

        return results.length > 0
            ? results
            : [{ title: 'No results', url: '', snippet: 'DDG returned no instant answers. Add BRAVE_API_KEY to .env for full web search.' }];
    } catch (err) {
        console.error('[webSearch] DDG error:', err.message);
        return [{ error: `Web search failed: ${err.message}` }];
    }
}

module.exports = { webSearch };
