// searchRepo.js — Recursive repo scanner with relevant snippet extraction

const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'coverage', '.cache', 'out', 'tmp', 'vendor',
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java',
  '.cpp', '.c', '.h', '.cs', '.rb', '.php', '.swift', '.kt',
  '.json', '.yaml', '.yml', '.toml', '.md', '.env.example',
]);

function walkRepo(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    if (IGNORE_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRepo(full, files);
    } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function scoreContent(content, keywords) {
  const lower = content.toLowerCase();
  return keywords.reduce((acc, kw) => {
    const re = new RegExp(kw.toLowerCase(), 'g');
    const count = (lower.match(re) || []).length;
    return acc + count * (kw.length > 4 ? 2 : 1);
  }, 0);
}

function extractSnippet(content, keywords, maxLines = 30) {
  const lines = content.split('\\n');
  const lower = content.toLowerCase();
  const hitLines = new Set();

  for (const kw of keywords) {
    let idx = 0;
    while ((idx = lower.indexOf(kw.toLowerCase(), idx)) !== -1) {
      const lineNo = content.substring(0, idx).split('\\n').length - 1;
      for (let i = Math.max(0, lineNo - 3); i <= Math.min(lines.length - 1, lineNo + 5); i++) {
        hitLines.add(i);
      }
      idx++;
    }
  }

  if (hitLines.size === 0) {
    return lines.slice(0, maxLines).join('\\n');
  }

  const sorted = [...hitLines].sort((a, b) => a - b).slice(0, maxLines);
  return sorted.map(i => lines[i]).join('\\n');
}

function extractKeywords(query) {
  const stopWords = new Set(['the','a','an','is','are','was','were','in','of','to','for','and','or','how','what','where','which','does','do','my','this','that','with','from','it','be','can','i','on','at','by']);
  return query
    .replace(/[^\\w\\s]/g, ' ')
    .split(/\\s+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 2 && !stopWords.has(w));
}

async function searchRepo(query, repoRoot = process.cwd(), topK = 5) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const allFiles = walkRepo(repoRoot);
  const scored = [];

  for (const filePath of allFiles) {
    let content;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (raw.length > 512_000) continue;
      content = raw;
    } catch { continue; }

    const score = scoreContent(content, keywords);
    if (score > 0) {
      scored.push({ filePath, content, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ filePath, content, score }) => ({
    filePath: path.relative(repoRoot, filePath),
    snippet: extractSnippet(content, keywords),
    score,
  }));
}

module.exports = { searchRepo, walkRepo };

