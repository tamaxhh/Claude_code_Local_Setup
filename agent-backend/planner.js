/**
 * planner.js
 * Decides which tools to call for a given question.
 *
 * Rules (simple keyword-based, no LLM call needed for planning):
 *
 * - "run test" / "test fails" / "does it pass" → runTests
 * - "search" / "find" / "where is" / "which file" → searchRepo
 * - "how to" / "docs" / "documentation" / "what is" / "explain" → webSearch + RAG
 * - everything else → searchRepo (look in code first)
 *
 * Returns: { useSearch, useTests, useWeb }
 */

function planTools(question, mode) {
    const q = question.toLowerCase();

    // Mode override from the extension (local = no web, web = force web)
    if (mode === 'local') return { useSearch: true, useTests: false, useWeb: false };
    if (mode === 'web') return { useSearch: true, useTests: false, useWeb: true };

    const useTests = /\b(test|tests|failing|fails|passes|assert|jest|pytest|spec)\b/.test(q);
    const useWeb = /\b(how to|what is|what are|explain|documentation|docs|example|tutorial|error:|errno)\b/.test(q);
    const useSearch = /\b(find|search|where|which file|defined|imported|used|called|function|class|variable)\b/.test(q) || !useWeb;

    return { useSearch, useTests, useWeb };
}

module.exports = { planTools };
