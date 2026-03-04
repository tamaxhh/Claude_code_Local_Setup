# Local Claude Coding Agent — Full Project Structure

## Root Directory: `c:\My Project\Claude_local_setup\`

```
Claude_local_setup/
│
├── README.md                          ← Project overview + setup instructions
│
├── proxy/                             ← Phase 2: Anthropic-style API proxy
│   ├── package.json
│   ├── index.js                       ← Express server, POST /v1/messages
│   ├── translators/
│   │   ├── toOllama.js                ← Convert Anthropic request → Ollama format
│   │   └── fromOllama.js              ← Convert Ollama response → Anthropic format
│   └── .env                           ← OLLAMA_BASE_URL=http://localhost:11434
│
├── agent-backend/                     ← Phase 3: Smart agent with tools
│   ├── package.json
│   ├── index.js                       ← Express server, POST /agent/complete
│   ├── tools/
│   │   ├── searchRepo.js              ← Search workspace files (ripgrep/glob)
│   │   ├── runTests.js                ← Run test command, return output
│   │   └── webSearch.js              ← Phase 5: Brave/DDG search API
│   ├── rag/
│   │   ├── fetcher.js                 ← Phase 5: Fetch + chunk web pages
│   │   └── selector.js               ← Phase 5: Pick top N relevant chunks
│   ├── planner.js                    ← Decide which tools to call for a question
│   └── .env                          ← Ports, API keys (web search)
│
├── vscode-extension/                  ← Phase 4: VS Code extension
│   ├── package.json                   ← Extension manifest (contributes.commands)
│   ├── tsconfig.json
│   ├── src/
│   │   ├── extension.ts              ← Entry: registers all commands
│   │   ├── commands/
│   │   │   ├── explain.ts            ← "LocalAgent: Explain Selection"
│   │   │   ├── refactor.ts           ← "LocalAgent: Refactor Selection"
│   │   │   └── implement.ts          ← "LocalAgent: Implement from Instruction"
│   │   ├── panel/
│   │   │   └── ResultPanel.ts        ← WebView panel to show LLM output
│   │   └── client.ts                 ← HTTP client → agent-backend:4000
│   └── out/                          ← Compiled JS output (auto-generated)
│
├── windsurf-config/                   ← Phase 6: Windsurf setup notes
│   └── setup-notes.md                ← Provider settings, base URL, model name
│
└── scripts/                           ← Helper scripts
    ├── start-all.ps1                  ← Start proxy + agent-backend together
    ├── stop-all.ps1                   ← Stop all services
    └── test-proxy.ps1                 ← Quick curl test for proxy health
```

---

## What Each Folder Does (Plain Language)

### `proxy/` — The "Translator"
Claude Code CLI expects to talk to Anthropic's API format. Ollama uses its own format.
This folder is a tiny Node.js web server that sits in between and **translates** the messages.

- **Input**: Claude-style request from Claude Code CLI or Windsurf
- **Output**: Ollama-style request → local model → translate back → return Claude-style response

### `agent-backend/` — The "Smart Brain"
This is your real agent. It receives a question from VS Code and decides:
1. Do I need to search your code files?
2. Do I need to run tests?
3. Do I need to search the web?
4. Then sends everything to the local model and returns the answer.

### `vscode-extension/` — The "UI in Your Editor"
This adds commands to VS Code:
- Right-click → **Explain this code**
- Right-click → **Refactor this**
- From command palette → **Implement: [describe what you want]**

It calls the `agent-backend` and shows the result in a side panel.

### `windsurf-config/` — The "Windsurf Notes"
Just a document explaining what settings to put in Windsurf so it uses your local model via the proxy instead of the real Claude API.

### `scripts/` — The "Start/Stop Helpers"
PowerShell scripts so you can start everything with one command instead of opening 3 terminals.

---

## Port Map

| Service         | Port  | Who talks to it                    |
|-----------------|-------|------------------------------------|
| Ollama          | 11434 | proxy (internal)                   |
| Proxy           | 3000  | Claude Code CLI, Windsurf          |
| Agent Backend   | 4000  | VS Code extension, you (curl/test) |

---

## Data Flow Diagrams

### Flow 1: Claude Code CLI → Local Model
```
Claude Code CLI
   │  POST /v1/messages
   ▼
proxy/:3000  ──translates──►  Ollama:11434 (qwen2.5-coder:7b)
   ◄──translates──────────────────────────────────────────
   │
   └→ returns Claude-style response to CLI
```

### Flow 2: VS Code Extension → Agent Backend → Local Model
```
VS Code Extension
   │  POST /agent/complete  { question, code_context }
   ▼
agent-backend/:4000
   ├─ searchRepo()   → reads local files
   ├─ runTests()     → runs your test command
   ├─ webSearch()    → (Phase 5) Brave/DDG API
   └─ calls proxy:3000 with combined context
         │
         ▼
      proxy/:3000  →  Ollama:11434
         ◄─────────────────────────
   │
   └→ returns answer/diff to VS Code extension → shown in panel
```

---

## Build Order Summary

| Phase | Folder(s) | What you can do after |
|-------|-----------|-----------------------|
| 1 | (Ollama, already done) | Send a message to local model via terminal |
| 2 | `proxy/` | Use Claude Code CLI with local model |
| 3 | `agent-backend/` | Ask questions that search your code |
| 4 | `vscode-extension/` | Right-click → Refactor in VS Code |
| 5 | `agent-backend/rag/`, `tools/webSearch.js` | Agent searches docs for you |
| 6 | `windsurf-config/` | Windsurf uses local model |
