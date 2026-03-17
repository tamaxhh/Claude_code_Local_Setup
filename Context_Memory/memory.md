<<<<<<< HEAD
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
=======
# BLACKBOXAI Memory Log for Claude_local_setup Project

## Project Context
- **Working Directory**: c:/My Project/Claude_local_setup
- **Operating System**: Windows 11
- **Default Shell**: C:\WINDOWS\system32\cmd.exe
- **Purpose**: Local setup for Claude-like AI development/testing with tools like Ollama.

## Session History

### Session 1: Initial Setup and Ollama Model Pull
- **User Request**: Feedback to create a memory.md file to track all chat sessions and project information for future reference.
- **Actions Taken**:
  - Created this memory.md file to persistently log all interactions, decisions, tool uses, and project state.
- **Current Status**:
  - Actively running terminal: `ollama pull qwen2.5-coder:7b` - Currently at ~20% progress (downloading layer 60e05f210007, slow due to network/bandwidth).
  - Open tabs in VSCode: README.md, TODO.md, run-test.ps1
  - Visible files: None
- **Key Environment Notes**:
  - Ollama model download in progress (large 4.7GB model, slow connection observed at 1-3 MB/s).
  - Project appears to be a local Claude AI setup using Ollama for coding model.

## Future Updates
This file will be appended with:
- New user requests
- Tool calls and results (e.g., file reads, edits, command outputs)
- Project changes (files created/edited, dependencies installed)
- Task progress from TODO.md
- Key decisions and plans

Last Updated: Initial creation during ongoing Ollama pull.
>>>>>>> 0262dc7 (Add memory log and environment setup scripts)
