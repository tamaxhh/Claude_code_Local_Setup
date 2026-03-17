// contextBuilder.js — Assemble tool results into a structured prompt block

const MAX_SNIPPET_CHARS = 1200;
const MAX_WEB_CHUNK_CHARS = 1000;

/**
 * Truncate text smartly at a sentence boundary.
 */
function truncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  const cut = text.lastIndexOf('\n', maxChars);
  return (cut > maxChars * 0.6 ? text.slice(0, cut) : text.slice(0, maxChars)) + '\n[... truncated]';
}

/**
 * Build the full context block injected into the LLM prompt.
 *
 * @param {Object} opts
 * @param {Array}  opts.repoSnippets   — [{ filePath, snippet }]
 * @param {Array}  opts.webChunks      — [{ text, source }]
 * @param {string} opts.testOutput     — stdout from test runner (optional)
 * @param {string} opts.selectedCode   — editor selection (optional)
 */
function buildContext({ repoSnippets = [], webChunks = [], testOutput = null, selectedCode = '' }) {
  const parts = [];

  // ── Selected code from editor ──────────────────────────────────────────────
  if (selectedCode?.trim()) {
    parts.push('### Selected Code\n```\n' + truncate(selectedCode.trim(), 2000) + '\n```');
  }

  // ── Repository snippets ────────────────────────────────────────────────────
  if (repoSnippets.length > 0) {
    const snippetBlocks = repoSnippets.map(({ filePath, snippet }) =>
      `#### File: ${filePath}\n\`\`\`\n${truncate(snippet, MAX_SNIPPET_CHARS)}\n\`\`\``
    ).join('\n\n');

    parts.push('### Repository Context\n' + snippetBlocks);
  }

  // ── Web RAG chunks ─────────────────────────────────────────────────────────
  if (webChunks.length > 0) {
    const webBlocks = webChunks.map(({ text, source }, i) =>
      `#### Web Source ${i + 1}: ${source}\n${truncate(text, MAX_WEB_CHUNK_CHARS)}`
    ).join('\n\n');

    parts.push('### Web Documentation\n' + webBlocks);
  }

  // ── Test output ────────────────────────────────────────────────────────────
  if (testOutput) {
    parts.push('### Test Output\n```\n' + truncate(testOutput, 1500) + '\n```');
  }

  if (parts.length === 0) return '';

  return '## Context\n\n' + parts.join('\n\n---\n\n');
}

module.exports = { buildContext };

