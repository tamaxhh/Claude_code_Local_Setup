# Claude Local Coding Agent

A fully local AI coding assistant that runs on your GPU (NVIDIA 3060) using Ollama.  
No API costs. No internet required for code tasks. Works with VS Code and Windsurf.

---

## Architecture

```
VS Code Extension ──► Agent Backend (port 4000)
                            │
                            ├─ searchRepo (your code files)
                            ├─ runTests   (your test suite)
                            └─ webSearch  (optional web docs)
                                          │
                                          ▼
                              Proxy (port 3000) ──► Ollama (port 11434)
                                                         │
                                                    qwen2.5-coder:7b
```

Claude Code CLI and Windsurf also point at the proxy directly.

---

## Quick Start

### 1. Make sure Ollama is running with the model

```powershell
ollama pull qwen2.5-coder:7b
ollama serve
```

### 2. Start proxy + agent backend

```powershell
cd "c:\My Project\Claude_local_setup"
.\scripts\start-all.ps1
```

### 3. Test everything is working

```powershell
.\scripts\test-proxy.ps1
```

### 4. Use Claude Code CLI with local model

```powershell
$env:ANTHROPIC_BASE_URL = "http://localhost:3000"
$env:ANTHROPIC_API_KEY  = "local-model"
claude
```

### 5. Install the VS Code Extension

```powershell
cd vscode-extension
npm install
npm run compile
```
Then press **F5** in VS Code to open the Extension Development Host.  
Right-click any code → **LocalAgent: Explain / Refactor / Implement**.

---

## Project Structure

```
Claude_local_setup/
├── proxy/              Anthropic→Ollama API proxy (port 3000)
├── agent-backend/      Smart agent with tools (port 4000)
├── vscode-extension/   VS Code extension (TypeScript)
├── windsurf-config/    Windsurf provider setup notes
├── scripts/            start-all.ps1 / stop-all.ps1 / test-proxy.ps1
└── project_structure.md  Full architecture reference
```

---

## Configuration

### proxy/.env
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
PROXY_PORT=3000
```

### agent-backend/.env
```
AGENT_PORT=4000
PROXY_BASE_URL=http://localhost:3000
WORKSPACE_ROOT=C:\My Project\Claude_local_setup
BRAVE_API_KEY=          # Optional: get free key at api.search.brave.com
```

### VS Code Settings (Ctrl+,)
```json
{
  "claudeLocal.backendUrl": "http://localhost:4000",
  "claudeLocal.defaultMode": "auto"
}
```

---

## Ports

| Service | Port |
|---|---|
| Ollama | 11434 |
| Proxy | 3000 |
| Agent Backend | 4000 |

---

## Stopping Services

```powershell
.\scripts\stop-all.ps1
```

---

## Adding Web Search (Optional)

1. Get a free Brave Search API key at [api.search.brave.com](https://api.search.brave.com)
2. Add it to `agent-backend/.env`:
   ```
   BRAVE_API_KEY=your_key_here
   ```
3. Restart agent backend. The extension will automatically use web docs for "how to" questions.

---

## Windsurf Setup

See [`windsurf-config/setup-notes.md`](windsurf-config/setup-notes.md) for Windsurf provider configuration.
