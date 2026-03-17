// webSearch.js — Web search with Brave API + graceful DuckDuckGo fallback

const axios = require('axios');

const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';

/**
 * Search using Brave Search API (preferred).
 */
async function braveSearch(query) {
  const res = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    headers: {
      'Accept'              : 'application/json',
      'Accept-Encoding'     : 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
    params : { q: query, count: 5 },
    timeout: 8000,
  });

  const results = res.data?.web?.results || [];
  return results.map(r => ({
    title      : r.title,
    url        : r.url,
    description: r.description || '',
  }));
}

/**
 * Fallback: DuckDuckGo Instant Answer API (no key, limited but free).
 */
async function ddgSearch(query) {
  const res = await axios.get('https://api.duckduckgo.com/', {
    params : { q: query, format: 'json', no_redirect: 1, no_html: 1, skip_disambig: 1 },
    timeout: 8000,
  });

  const results = [];

  if (res.data?.AbstractURL) {
    results.push({
      title      : res.data.Heading || query,
      url        : res.data.AbstractURL,
      description: res.data.AbstractText || '',
    });
  }

  for (const topic of (res.data?.RelatedTopics || []).slice(0, 4)) {
    if (topic.FirstURL && topic.Text) {
      results.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, description: topic.Text });
    }
  }

  return results;
}

/**
 * Main export — tries Brave first, falls back to DDG, then returns empty.
 */
async function webSearch(query) {
  if (BRAVE_API_KEY) {
    try {
      const results = await braveSearch(query);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn('[webSearch] Brave failed:', e.message);
    }
  }

  try {
    const results = await ddgSearch(query);
    if (results.length > 0) return results;
  } catch (e) {
    console.warn('[webSearch] DDG failed:', e.message);
  }

  console.warn('[webSearch] All search providers failed — returning empty.');
  return [];
}

module.exports = { webSearch };

