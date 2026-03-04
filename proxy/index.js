/**
 * proxy/index.js
 * Anthropic-style API proxy server.
 *
 * Exposes:  POST /v1/messages  (Anthropic format)
 * Forwards: POST /api/chat     (Ollama format)
 *
 * Set these env vars before running Claude Code CLI:
 *   $env:ANTHROPIC_BASE_URL = "http://localhost:3000"
 *   $env:ANTHROPIC_API_KEY  = "local-model"
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { toOllama } = require('./translators/toOllama');
const { fromOllama, fromOllamaStreamChunk } = require('./translators/fromOllama');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const PORT = process.env.PROXY_PORT || 3000;

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Claude Local Proxy is running', model: OLLAMA_MODEL });
});

// ─── Models endpoint (Claude Code CLI calls this) ────────────────────────────
app.get('/v1/models', (req, res) => {
    res.json({
        data: [
            { id: OLLAMA_MODEL, object: 'model', created: Date.now(), owned_by: 'local' },
        ],
    });
});

// ─── Main messages endpoint ───────────────────────────────────────────────────
app.post('/v1/messages', async (req, res) => {
    const anthropicBody = req.body;
    const isStreaming = anthropicBody.stream === true;

    console.log(`\n[proxy] → ${anthropicBody.model || 'default'} | stream=${isStreaming}`);
    console.log(`[proxy]   messages: ${(anthropicBody.messages || []).length} | system: ${!!anthropicBody.system}`);

    // Convert Anthropic → Ollama format
    const ollamaBody = toOllama(anthropicBody, OLLAMA_MODEL);

    try {
        if (isStreaming) {
            // ── Streaming mode ───────────────────────────────────────────────────
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const ollamaStream = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
                ...ollamaBody,
                stream: true,
            }, { responseType: 'stream' });

            let chunkIndex = 0;
            let buffer = '';

            ollamaStream.data.on('data', (rawChunk) => {
                buffer += rawChunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk = JSON.parse(line);
                        const events = fromOllamaStreamChunk(chunk, chunkIndex);
                        chunkIndex++;

                        for (const event of events) {
                            res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
                        }

                        if (chunk.done) {
                            res.end();
                        }
                    } catch (e) {
                        // Skip malformed JSON chunks
                    }
                }
            });

            ollamaStream.data.on('error', (err) => {
                console.error('[proxy] Stream error:', err.message);
                res.end();
            });

        } else {
            // ── Non-streaming mode ───────────────────────────────────────────────
            const ollamaRes = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
                ...ollamaBody,
                stream: false,
            });

            const anthropicResponse = fromOllama(ollamaRes.data, anthropicBody.model);
            console.log(`[proxy] ← response tokens: ${anthropicResponse.usage.output_tokens}`);
            res.json(anthropicResponse);
        }

    } catch (err) {
        const status = err.response?.status || 500;
        const message = err.response?.data || err.message;
        console.error('[proxy] Error calling Ollama:', message);
        res.status(status).json({
            type: 'error',
            error: { type: 'api_error', message: `Ollama error: ${JSON.stringify(message)}` },
        });
    }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ Claude Local Proxy running on http://localhost:${PORT}`);
    console.log(`   Forwarding to Ollama at: ${OLLAMA_BASE_URL}`);
    console.log(`   Model: ${OLLAMA_MODEL}`);
    console.log(`\n   To use with Claude Code CLI, run:`);
    console.log(`   $env:ANTHROPIC_BASE_URL = "http://localhost:${PORT}"`);
    console.log(`   $env:ANTHROPIC_API_KEY  = "local-model"`);
    console.log(`   claude\n`);
});
