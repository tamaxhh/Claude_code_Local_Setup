const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

const SKILLS_DIR = path.join(__dirname, '../../skills');

async function searchSkills(query, topK = 3) {
  try {
    const skillFiles = await glob('skills/*.json', { cwd: process.cwd() });
    const scored = [];

    for (const file of skillFiles) {
      const fullPath = path.join(process.cwd(), file);
      const meta = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      const score = scoreMatch(query.toLowerCase(), meta);
      if (score > 0) {
        scored.push({ file: path.basename(file, '.json'), meta, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  } catch (e) {
    console.warn('[searchSkills] Error:', e.message);
    return [];
  }
}

function scoreMatch(query, meta) {
  const qWords = query.split(/\\s+/).filter(w => w.length > 2);
  let score = 0;
  for (const word of qWords) {
    if (meta.name.toLowerCase().includes(word)) score += 3;
    if (meta.description.toLowerCase().includes(word)) score += 2;
    if (meta.tags.some(t => t.toLowerCase().includes(word))) score += 1;
  }
  return score / qWords.length;
}

module.exports = { searchSkills };
