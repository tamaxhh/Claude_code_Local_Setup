const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';

async function createSkill(query, repoRoot = process.cwd()) {
  const skillName = await suggestSkillName(query);
  const skillDir = path.join(process.cwd(), 'skills');

  // LLM generate metadata
  const metaPrompt = `Suggest JSON metadata for a reusable skill for task: "${query}"
Format exactly: {"name": "skill-hyphen-name", "description": "brief desc", "tags": ["tag1", "tag2"]}
Keep name short, lowercase-hyphen.`;
  
  const metaRes = await axios.post(OLLAMA_URL + '/api/generate', {
    model: MODEL,
    prompt: metaPrompt,
    options: { temperature: 0.1, num_predict: 200 },
    stream: false,
  });
  const meta = JSON.parse(metaRes.data.response.trim());

  // LLM generate JS code
  const jsPrompt = `Write a complete Node.js module for skill "${meta.name}" handling "${query}".
Export async function execute(query, repoRoot) { ... return result string; }
Use only safe Node APIs, axios, fs-extra if needed. No malicious code.
Full code:`;
  
  const jsRes = await axios.post(OLLAMA_URL + '/api/generate', {
    model: MODEL,
    prompt: jsPrompt,
    options: { temperature: 0.3, num_predict: 2048 },
    stream: false,
  });
  const jsCode = jsRes.data.response.trim();

  // Save
  await fs.writeJson(path.join(skillDir, `${meta.name}.json`), meta, { spaces: 2 });
  await fs.writeFile(path.join(skillDir, `${meta.name}.js`), jsCode);
  
  return { skillName: meta.name, meta, jsCode };
}

async function suggestSkillName(query) {
  const prompt = `For task "${query}", suggest short hyphenated skill name (e.g. redis-node, git-init). Respond ONLY with name:`;
  const res = await axios.post(OLLAMA_URL + '/api/generate', {
    model: MODEL, prompt, options: { temperature: 0.1, num_predict: 50 }, stream: false,
  });
  return res.data.response.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
}

module.exports = { createSkill, suggestSkillName };
