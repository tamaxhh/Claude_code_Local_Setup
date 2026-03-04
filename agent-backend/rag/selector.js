/**
 * rag/selector.js
 * Selects the most relevant text chunks from fetched web pages.
 *
 * Uses keyword overlap scoring (no embeddings needed, no GPU required).
 * For each chunk, counts how many words from the question appear in it.
 *
 * Returns: Top N chunks as a single combined string for the LLM prompt.
 */

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'this', 'that', 'it', 'its', 'and', 'or', 'but', 'if', 'not', 'i',
    'you', 'we', 'they', 'he', 'she', 'what', 'how', 'when', 'where', 'why',
]);

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreChunk(chunk, questionTokens) {
    const chunkTokens = new Set(tokenize(chunk.text));
    let matches = 0;
    for (const token of questionTokens) {
        if (chunkTokens.has(token)) matches++;
    }
    return matches;
}

/**
 * @param {Array<{url, chunkIndex, text}>} chunks - All fetched chunks
 * @param {string} question - The user's question
 * @param {number} topN - How many chunks to return
 * @returns {string} Combined context string ready to inject into LLM prompt
 */
function selectTopChunks(chunks, question, topN = 6) {
    if (!chunks || chunks.length === 0) return '';

    const questionTokens = tokenize(question);

    const scored = chunks.map((chunk) => ({
        ...chunk,
        score: scoreChunk(chunk, questionTokens),
    }));

    // Sort by score descending, take top N
    const topChunks = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .filter((c) => c.score > 0); // Only include chunks with at least 1 match

    if (topChunks.length === 0) {
        // Fallback: just take the first N chunks if nothing matched
        return chunks
            .slice(0, 3)
            .map((c) => `[Source: ${c.url}]\n${c.text}`)
            .join('\n\n---\n\n');
    }

    return topChunks
        .map((c) => `[Source: ${c.url} | relevance: ${c.score}]\n${c.text}`)
        .join('\n\n---\n\n');
}

module.exports = { selectTopChunks };
