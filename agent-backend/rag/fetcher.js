/**
 * rag/fetcher.js
 * Fetches a web page and breaks it into text chunks.
 * Uses cheerio to extract clean text, skipping nav/footer/ads.
 *
 * Returns: Array of { url, chunkIndex, text }
 */

const axios = require('axios');
const cheerio = require('cheerio');

const CHUNK_SIZE = 800;  // characters per chunk
const MAX_CHUNKS_PER_PAGE = 20;

async function fetchAndChunk(url) {
    try {
        const res = await axios.get(url, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocalAgent/1.0)' },
            maxContentLength: 500_000, // 500 KB max
        });

        const $ = cheerio.load(res.data);

        // Remove noisy elements
        $('script, style, nav, footer, header, aside, .sidebar, .menu, .ad, .ads, .advertisement').remove();

        // Extract text from meaningful elements
        const textParts = [];
        $('p, h1, h2, h3, h4, pre, code, li, blockquote').each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > 30) {
                textParts.push(text);
            }
        });

        const fullText = textParts.join('\n\n');

        // Split into fixed-size chunks with overlap
        const chunks = [];
        let i = 0;
        while (i < fullText.length && chunks.length < MAX_CHUNKS_PER_PAGE) {
            const chunkText = fullText.slice(i, i + CHUNK_SIZE);
            if (chunkText.trim().length > 50) {
                chunks.push({
                    url,
                    chunkIndex: chunks.length,
                    text: chunkText,
                });
            }
            i += CHUNK_SIZE - 100; // 100 char overlap
        }

        return chunks;
    } catch (err) {
        console.error(`[fetcher] Failed to fetch ${url}: ${err.message}`);
        return [];
    }
}

/**
 * Fetch multiple URLs in parallel and return all chunks.
 */
async function fetchMultipleAndChunk(urls) {
    const allChunks = await Promise.all(urls.map((url) => fetchAndChunk(url)));
    return allChunks.flat();
}

module.exports = { fetchAndChunk, fetchMultipleAndChunk };
