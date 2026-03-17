/**
 * planner.js — Intelligent multi-step reasoning pipeline with self-extending skills
 */

const { searchRepo } = require('./tools/searchRepo');
const { webSearch } = require('./tools/webSearch');
const { runTests } = require('./tools/runTests');
const { searchSkills } = require('./tools/searchSkills');
const { executeSkill } = require('./tools/executeSkill');
const { createSkill } = require('./tools/createSkill');
const { fetchAndChunk } = require('./rag/fetcher');
const { selectTopChunks } = require('./rag/selector');
const { buildContext } = require('./contextBuilder');
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';

/**
 * Analyze the user query to decide which tools to invoke.
 */
function analyzeIntent(query) {
  const q = query.toLowerCase();

  const intents = {
    searchRepo: /\\b(file|function|class|import|module|project|codebase|this repo|my code|where is|how does|implement|refactor)\\b/.test(q),
    webSearch: /\\b(how to|what is|latest|docs|documentation|library|framework|example|tutorial|error|fix|npm|package)\\b/.test(q),
    runTests: /\\b(test|spec|jest|vitest|run tests|failing|pass)\\b/.test(q),
  };

  // Always search repo if no strong signal — project context is cheap and useful
  if (!intents.webSearch && !intents.runTests) {
    intents.searchRepo = true;
  }

  return intents;
}

/**
 * Main agent pipeline with self-extension.
 * @param {string} query — user question
 * @param {string} selectedCode — code selected in the editor (may be empty)
 * @param {string} repoRoot — absolute path to the workspace root
 */
async function plan(query, selectedCode = '', repoRoot = process.cwd()) {
  // Step 0: Self-extending skill check (reference ADK skill reuse)
  let skillResult = null;
  try {
    const skillMatches = await searchSkills(query);
    if (skillMatches.length > 0) {
      skillResult = await executeSkill(skillMatches[0].file, query, repoRoot);
      // Auto-refine: create improved skill
      await createSkill(query + ' (refine from prior: ' + skillResult.slice(0,100) + ')', repoRoot);
      return {
        answer: skillResult,
        context: { usedSkill: skillMatches[0].file },
        selfExtended: true
      };
    }
  } catch (e) {
    console.warn('[planner] Skills phase failed:', e.message);
  }

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
      const fetched = await Promise.allSettled(fetchJobs);
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
    repoSnippets: toolResults.repo || [],
    webChunks,
    testOutput: toolResults.tests || null,
    selectedCode,
  });

  // Step 5: Call LLM
  const systemPrompt = buildSystemPrompt();
  const userMessage = contextBlock
    ? contextBlock + '\\n\\n---\\nQuestion: ' + query
    : query;

  const response = await axios.post(OLLAMA_URL + '/api/chat', {
    model: MODEL,
    stream: false,
    options: { temperature: 0.2, num_predict: 2048 },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  // Post-LLM: Create skill for future reuse (self-extension)
  try {
    await createSkill(query, repoRoot);
  } catch (e) {
    console.warn('[planner] Skill creation post-response failed:', e.message);
  }

  return {
    answer: response.data.message.content || '',
    context: { repoHits: toolResults.repo?.length || 0, webChunks: webChunks.length, skillsChecked: true },
  };
}

function buildSystemPrompt() {
  return `You are a self-extending software engineer AI. First check skills registry, reuse if perfect match, else use tools/context.

Updated CAPABILITIES:
- Self-extending: Creates/reuses persistent JS skills in /skills/
- Local codebase search, web RAG, test execution

Same BEHAVIOR/CONSTRAINTS as before.`;
}

module.exports = { plan };

