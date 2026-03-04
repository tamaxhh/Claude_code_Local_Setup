/**
 * agent-backend/index.js
 * Smart agent server.
 *
 * Endpoint: POST /agent/complete
 * Body: {
 *   question: string,
 *   code_context: { file_path?, selection?, surrounding?, other_files? },
 *   mode: "local" | "web" | "auto"   (default: "auto")
 *   workspace_root?: string           (overrides .env WORKSPACE_ROOT)
 * }
 *
 * Response: {
 *   answer: string,
 *   tools_used: string[],
 *   context_summary: string
 * }
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const { planTools } = require('./planner');
const { searchRepo } = require('./tools/searchRepo');
const { runTests } = require('./tools/runTests');
const { webSearch } = require('./tools/webSearch');
const { fetchMultipleAndChunk } = require('./rag/fetcher');
const { selectTopChunks } = require('./rag/selector');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.AGENT_PORT || 4000;
const PROXY_BASE_URL = process.env.PROXY_BASE_URL || 'http://localhost:3000';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Claude Local Agent Backend is running', port: PORT });
});

// ─── Main agent endpoint ───────────────────────────────────────────────────────
app.post('/agent/complete', async (req, res) => {
    const { question, code_context = {}, mode = 'auto', workspace_root } = req.body;

    if (!question || !question.trim()) {
        return res.status(400).json({ error: 'question is required' });
    }

    const workspaceRoot = workspace_root || WORKSPACE_ROOT;
    const toolsUsed = [];
    const contextParts = [];

    console.log(`\n[agent] Question: "${question.slice(0, 80)}..."`);
    console.log(`[agent] Mode: ${mode} | Workspace: ${workspaceRoot}`);

    // ── 1. Plan which tools to use ─────────────────────────────────────────────
    const plan = planTools(question, mode);
    console.log(`[agent] Plan:`, plan);

    // ── 2. Add code context from editor ────────────────────────────────────────
    if (code_context.file_path) {
        contextParts.push(`## Current File\nPath: ${code_context.file_path}`);
    }
    if (code_context.selection) {
        contextParts.push(`## Selected Code\n\`\`\`\n${code_context.selection}\n\`\`\``);
    }
    if (code_context.surrounding) {
        contextParts.push(`## Surrounding Context\n\`\`\`\n${code_context.surrounding}\n\`\`\``);
    }
    if (code_context.other_files?.length > 0) {
        const otherFilesText = code_context.other_files
            .slice(0, 3)
            .map((f) => `### ${f.path}\n\`\`\`\n${(f.content || '').slice(0, 1000)}\n\`\`\``)
            .join('\n\n');
        contextParts.push(`## Related Files\n${otherFilesText}`);
    }

    // ── 3. Run tools in parallel ────────────────────────────────────────────────
    const toolPromises = [];

    if (plan.useSearch) {
        toolPromises.push(
            searchRepo(question, workspaceRoot).then((result) => {
                toolsUsed.push('searchRepo');
                if (result.results?.length > 0) {
                    const snippets = result.results
                        .slice(0, 10)
                        .map((r) => `${r.filePath}:${r.lineNumber}  ${r.lineContent}`)
                        .join('\n');
                    contextParts.push(`## Code Search Results (query: "${question}")\n\`\`\`\n${snippets}\n\`\`\``);
                }
            })
        );
    }

    if (plan.useTests) {
        toolPromises.push(
            runTests(workspaceRoot).then((result) => {
                toolsUsed.push('runTests');
                const testSummary = `Command: ${result.command}\nExit code: ${result.exitCode}\nSuccess: ${result.success}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`;
                contextParts.push(`## Test Results\n\`\`\`\n${testSummary}\n\`\`\``);
            })
        );
    }

    if (plan.useWeb) {
        toolPromises.push(
            webSearch(question).then(async (searchResults) => {
                toolsUsed.push('webSearch');
                const urls = searchResults
                    .filter((r) => r.url && !r.error)
                    .slice(0, 4)
                    .map((r) => r.url);

                if (urls.length > 0) {
                    const chunks = await fetchMultipleAndChunk(urls);
                    toolsUsed.push('ragFetch');
                    const docContext = selectTopChunks(chunks, question, 6);
                    if (docContext) {
                        contextParts.push(`## Web Documentation Context\n${docContext}`);
                    }
                }

                // Also include search snippets as a fallback
                const snippets = searchResults
                    .filter((r) => r.snippet && !r.error)
                    .map((r) => `**${r.title}** (${r.url})\n${r.snippet}`)
                    .join('\n\n');
                if (snippets) {
                    contextParts.push(`## Web Search Snippets\n${snippets}`);
                }
            })
        );
    }

    await Promise.all(toolPromises);

    // ── 4. Build final prompt ───────────────────────────────────────────────────
    const contextBlock = contextParts.join('\n\n');
    const systemPrompt = `You are an expert coding assistant. You help developers write, understand, and improve code.
Be concise and practical. Provide working code examples when relevant.
If you suggest code changes, show the complete relevant section (not just a line or two).`;

    const userMessage = contextBlock
        ? `Here is context about the codebase:\n\n${contextBlock}\n\n---\n\nQuestion: ${question}`
        : question;

    console.log(`[agent] Calling local LLM (context: ${contextBlock.length} chars, tools: ${toolsUsed.join(', ') || 'none'})`);

    // ── 5. Call local LLM via proxy ────────────────────────────────────────────
    try {
        const llmRes = await axios.post(`${PROXY_BASE_URL}/v1/messages`, {
            model: OLLAMA_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
            stream: false,
        }, { timeout: 120000 }); // 2 min timeout

        const answer = llmRes.data?.content?.[0]?.text || 'No response from model.';

        console.log(`[agent] ✓ Response received (${answer.length} chars)`);

        res.json({
            answer,
            tools_used: toolsUsed,
            context_summary: `Used ${toolsUsed.length} tool(s). Context size: ${contextBlock.length} chars.`,
        });

    } catch (err) {
        const msg = err.response?.data || err.message;
        console.error('[agent] LLM call failed:', msg);
        res.status(500).json({ error: `LLM call failed: ${JSON.stringify(msg)}`, tools_used: toolsUsed });
    }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ Agent Backend running on http://localhost:${PORT}`);
    console.log(`   Proxy:     ${PROXY_BASE_URL}`);
    console.log(`   Model:     ${OLLAMA_MODEL}`);
    console.log(`   Workspace: ${WORKSPACE_ROOT}`);
    console.log(`\n   Test it:  POST http://localhost:${PORT}/agent/complete`);
    console.log(`   Body:     { "question": "What does index.js do?", "mode": "auto" }\n`);
});
