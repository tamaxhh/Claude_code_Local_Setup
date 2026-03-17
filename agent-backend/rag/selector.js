// selector.js — Chunk ranking via keyword overlap + bigram TF-IDF approximation

const STOP = new Set(['the','a','an','is','are','was','were','be','been','in','of','to','for',
  'and','or','but','how','what','where','which','does','do','my','this','that','with','from',
  'it','can','i','on','at','by','we','you','they','he','she','its','our','your','their',
  'if','so','as','not','no','has','have','had','will','would','could','should','may','might',
  'then','than','when','while','just','also','more','some','all','any','into','about','up',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\\w \\s]/g, ' ')
    .split(/\\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

function termFreq(tokens) {
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  return tf;
}

function keywordScore(queryTokens, chunkTokens) {
  const qSet = new Set(queryTokens);
  const cTF = termFreq(chunkTokens);
  let score = 0;

  for (const term of qSet) {
    if (cTF[term]) {
      score += 1 + Math.min(cTF[term] - 1, 2) * 0.3;
    }
  }

  return score / (qSet.size + 1);
}

function bigramScore(queryTokens, chunkTokens) {
  const bigrams = (tokens) => {
    const bg = new Set();
    for (let i = 0; i < tokens.length - 1; i++) {
      bg.add(tokens[i] + ':' + tokens[i+1]);
    }
    return bg;
  };

  const qBG = bigrams(queryTokens);
  const cBG = bigrams(chunkTokens);
  if (qBG.size === 0) return 0;

  let overlap = 0;
  for (const bg of qBG) {
    if (cBG.has(bg)) overlap++;
  }
  return overlap / qBG.size;
}

function lengthPenalty(text) {
  const len = text.length;
  if (len < 150) return 0.5;
  if (len > 4000) return 0.8;
  return 1.0;
}

function deduplicate(scored) {
  const selected = [];

  for (const item of scored) {
    const itemSet = new Set(tokenize(item.chunk.text));
    const isDup = selected.some(sel => {
      const selSet = new Set(tokenize(sel.chunk.text));
      const inter = [...itemSet].filter(t => selSet.has(t)).length;
      const union = new Set([...itemSet, ...selSet]).size;
      return inter / union > 0.6;
    });
    if (!isDup) selected.push(item);
  }

  return selected;
}

function selectTopChunks(query, chunks, topK = 4) {
  if (!chunks || chunks.length === 0) return [];

  const qTokens = tokenize(query);
  if (qTokens.length === 0) return chunks.slice(0, topK);

  const scored = chunks.map(chunk => {
    const cTokens = tokenize(chunk.text);
    const score = keywordScore(qTokens, cTokens) * 0.6 +
                  bigramScore(qTokens, cTokens) * 0.4;
    return { chunk, score: score * lengthPenalty(chunk.text) };
  });

  scored.sort((a, b) => b.score - a.score);

  const deduped = deduplicate(scored);
  return deduped.slice(0, topK).map(s => s.chunk);
}

module.exports = { selectTopChunks, tokenize };

