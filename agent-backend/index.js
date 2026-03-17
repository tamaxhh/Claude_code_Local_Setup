// index.js — Self-Extending Agent HTTP server (Node.js port of ADKGoogle features)

require('dotenv').config();
const express = require('express');
const path = require('path');
const { plan } = require('./planner');

const app = express();
const PORT = process.env.AGENT_PORT || 4000;

app.use(express.json({ limit: '4mb' }));
app.use(express.static('../public'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/ui', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.get('/skills', async (req, res) => {
  const { glob } = require('glob');
  const skillFiles = await glob('skills/*.json');
  res.json(skillFiles);
});

app.post('/agent/complete', async (req, res) => {
  const { query, selectedCode = '', repoRoot } = req.body;

  if (!query?.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const result = await plan(query, selectedCode, repoRoot || process.cwd());
    res.json(result);
  } catch (err) {
    console.error('[agent] Error:', err.message);
    res.status(500).json({ error: 'Agent failed', detail: err.message });
  }
});

app.listen(PORT, () => console.log('[agent] Self-Extending Agent listening on :' + PORT));

