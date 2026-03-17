/**
 * planner.js — Intelligent multi-step reasoning pipeline
 */

const { searchRepo } = require('./tools/searchRepo');
const { webSearch }  = require('./tools/webSearch');
const { runTests }   = require('./tools/runTests');
const { fetchAndChunk } = require('./rag/fetcher');
const { selectTopChunks } = require('./rag/selector');
const { buildContext } = require('./contextBuilder');
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL      = process.env.OLLAMA_MODEL || 'qwen2.5-coder';

/**
 * Analyze the user query to decide which tools to invoke.
 */
function analyzeIntent(query) {
  const q = query.toLowerCase();

  const intents = {
    searchRepo: /\\b(file|function|class|import|module|project|codebase|this repo|my code|where is|how does|implement|refactor)\\b/.test(q),
    webSearch:  /\\b(how to|what is|latest|docs|documentation|library|framework|example|tutorial|error|fix|npm|package)\\b/.test(q),
    runTests:   /\\b(test|spec|jest|vitest|run tests|failing|pass)\\b/.test(q),
  };

  // Always search repo if no strong signal — project context is cheap and useful
  if (!intents.webSearch && !intents.runTests) {
    intents.searchRepo = true;
  }

  return intents;
}

/**
 * Main agent pipeline.
 * @param {string} query — user question
 * @param {string} selectedCode — code selected in the editor (may be empty)
 * @param {string} repoRoot — absolute path to the workspace root
 */
async function plan(query, selectedCode = '', repoRoot = process.cwd()) {
  const intents = analyzeIntent(query);
  const toolResults = {};

  // Step 1: Gather repo context
  if (intents.searchRepo) {
    try {
      toolResults.repo = await searchRepo(query, repoRoot);
    } catch (e) {
      console.warn('[planner] searchRepo failed:', e.message);
      toolResults.repo = [];
    }
  }

  // Step 2: Gather web context
  let webChunks = [];
  if (intents.webSearch) {
    try {
      const webResults = await webSearch(query);
      const fetchJobs = webResults.slice(0, 3).map(r => fetchAndChunk(r.url));
      const fetched   = await Promise.allSettled(fetchJobs);
      for (const f of fetched) {
        if (f.status === 'fulfilled') webChunks.push(...f.value);
      }
      webChunks = selectTopChunks(query, webChunks, 4);
    } catch (e) {
      console.warn('[planner] webSearch/RAG failed:', e.message);
    }
  }

  // Step 3: Run tests if needed
  if (intents.runTests) {
    try {
      toolResults.tests = await runTests(repoRoot);
    } catch (e) {
      console.warn('[planner] runTests failed:', e.message);
    }
  }

  // Step 4: Build context prompt
  const contextBlock = buildContext({
    repoSnippets : toolResults.repo   || [],
    webChunks,
    testOutput   : toolResults.tests  || null,
    selectedCode,
  });

  // Step 5: Call LLM
  const systemPrompt = buildSystemPrompt();
  const userMessage  = contextBlock
    ? contextBlock + '\\n\\n---\\nQuestion: ' + query
    : query;

  const response = await axios.post(OLLAMA_URL + '/api/chat', {
    model   : MODEL,
    stream  : false,
    options : { temperature: 0.2, num_predict: 2048 },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return {
    answer  : response.data.message.content || '',
    context : { repoHits: toolResults.repo?.length || 0, webChunks: webChunks.length },
  };
}

function buildSystemPrompt() {
  return `You are an expert software engineer and AI coding assistant embedded in a developer's IDE.

BEHAVIOR:
- Answer using the provided context first. Never ignore supplied code or snippets.
- If context is insufficient, say so clearly rather than hallucinating.
- When writing code, produce complete, runnable solutions.
- Format code blocks with the correct language tag.
- Be concise but thorough. Skip pleasantries.

CAPABILITIES:
- Deep understanding of the local codebase via retrieved snippets
- Access to web documentation via RAG-retrieved chunks
- Ability to reason about architecture, bugs, refactors, and tests

CONSTRAINTS:
- Do not invent function names, imports, or APIs that aren't in the context.
- If you're unsure about something, say "I'm not certain — verify this."`;
}

module.exports = { plan };

