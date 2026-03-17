// fetcher.js — URL fetcher + HTML cleaner + token-aware chunker

const axios = require('axios');
const { JSDOM } = require('jsdom');

const CHUNK_TARGET_CHARS = 1600;
const CHUNK_MAX_CHARS    = 3200;
const FETCH_TIMEOUT_MS   = 10000;

/**
 * Fetch a URL and return its cleaned text content.
 */
async function fetchText(url) {
  const res = await axios.get(url, {
    timeout: FETCH_TIMEOUT_MS,
    maxContentLength: 2000000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIAgent/1.0)' },
    responseType: 'text',
  });

  const contentType = res.headers['content-type'] || '';

  if (contentType.includes('text/html')) {
    return cleanHtml(res.data, url);
  }

  return res.data.slice(0, 50000);
}

/**
 * Strip HTML noise; extract meaningful text.
 */
function cleanHtml(html, url) {
  const dom  = new JSDOM(html, { url });
  const doc  = dom.window.document;

  for (const sel of ['script','style','nav','footer','header','aside','noscript','form','svg','iframe']) {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  }

  const main = doc.querySelector('article') || doc.querySelector('main') || doc.body;
  const text = main?.textContent || '';

  return text
    .replace(/\\s{3,}/g, '\\n\\n')
    .replace(/\\n{4,}/g, '\\n\\n\\n')
    .trim()
    .slice(0, 50000);
}

/**
 * Split text into overlapping chunks for RAG.
 */
function chunkText(text, source) {
  const paragraphs = text.split(/\\n{2,}/);
  const chunks     = [];
  let buffer       = '';

  for (const para of paragraphs) {
    if (!para.trim()) continue;

    if ((buffer + para).length > CHUNK_MAX_CHARS && buffer.length >= CHUNK_TARGET_CHARS) {
      chunks.push({ text: buffer.trim(), source });
      const sentences = buffer.split(/(?<=[.!?])\\s+/);
      buffer = sentences.slice(-2).join(' ') + '\\n\\n' + para;
    } else {
      buffer += (buffer ? '\\n\\n' : '') + para;
    }
  }

  if (buffer.trim().length > 100) {
    chunks.push({ text: buffer.trim(), source });
  }

  return chunks;
}

/**
 * Fetch a URL and return an array of text chunks ready for RAG.
 */
async function fetchAndChunk(url) {
  const text = await fetchText(url);
  return chunkText(text, url);
}

module.exports = { fetchAndChunk, fetchText, chunkText };

