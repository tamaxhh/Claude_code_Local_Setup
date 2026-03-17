// index.js — Agent HTTP server

require('dotenv').config();
const express = require('express');
const { plan } = require('./planner');

const app  = express();
const PORT = process.env.AGENT_PORT || 4000;

app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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

app.listen(PORT, () => console.log('[agent] Listening on :' + PORT));

