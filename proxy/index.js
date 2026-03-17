// proxy/index.js — Clean Ollama proxy with proper error handling

require('dotenv').config();
const express = require('express');
const axios   = require('axios');

const app        = express();
const OLLAMA_URL = process.env.OLLAMA_URL  || 'http://localhost:11434';
const MODEL      = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
const PORT       = process.env.PROXY_PORT   || 3000;

app.use(express.json({ limit: '4mb' }));

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', model: MODEL }));

// Anthropic-compatible messages endpoint → Ollama
app.post('/v1/messages', async (req, res) => {
  const { messages = [], system, max_tokens = 2048, temperature = 0.2 } = req.body;

  // Build Ollama messages array
  const ollamaMessages = [];
  if (system) ollamaMessages.push({ role: 'system', content: system });
  ollamaMessages.push(...messages);

  try {
    const response = await axios.post(OLLAMA_URL + '/api/chat', {
      model  : MODEL,
      stream : false,
      options: { temperature, num_predict: max_tokens },
      messages: ollamaMessages,
    }, { timeout: 120000 });

    const content = response.data?.message?.content || '';

    // Return Anthropic-shaped response for client compatibility
    res.json({
      id     : 'msg_' + Date.now(),
      type   : 'message',
      role   : 'assistant',
      content: [{ type: 'text', text: content }],
      model  : MODEL,
      stop_reason: 'end_turn',
      usage  : { input_tokens: 0, output_tokens: 0 },
    });
  } catch (err) {
    const status = err.response?.status || 502;
    const detail = err.response?.data || err.message;
    console.error('[proxy] Ollama error:', detail);
    res.status(status).json({ error: 'LLM request failed', detail });
  }
});

app.listen(PORT, () => console.log('[proxy] Listening on :' + PORT));

