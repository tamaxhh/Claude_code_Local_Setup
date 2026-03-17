# Project Memory - Local Claude Coding Agent

## Setup Status (2026-03-17)
- Ollama model: qwen2.5-coder:7b (assume downloaded)
- .env files created: proxy/, agent-backend/
- Services: proxy crashed on large payload Ollama error; agent OK
- Claude CLI: env set, but proxy down → ECONNREFUSED

## Debug History
- test-proxy initially OK
- Proxy crash: TypeError JSON.stringify circular (index.js:116), Ollama 400 'json cannot unmarshal array'
- Killed old node, ran start-all.ps1 → new windows opened
- Next: Fix proxy error handling

## Full Structure Recap
[ pasted project_structure.md summary ]
