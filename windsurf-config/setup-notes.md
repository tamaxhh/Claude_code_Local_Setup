# Windsurf Integration Setup

## What to Configure

Windsurf lets you set a custom AI provider. Point it at your local proxy so it uses
your 3060 (qwen2.5-coder:7b) instead of the real Claude API.

---

## Settings to Enter in Windsurf

| Field | Value |
|---|---|
| Provider | Anthropic (custom / local) |
| Base URL | `http://localhost:3000` |
| API Key | `local-model` (any non-empty string works) |
| Model | `qwen2.5-coder:7b` |

> **Important:** The proxy must be running (`.\scripts\start-all.ps1`) before
> Windsurf can use the local model.

---

## Where to Find These Settings

1. Open Windsurf → Settings (gear icon or `Ctrl+,`)
2. Search for **AI Provider** or **Model Settings**
3. Switch provider from "Anthropic / Claude" to "Custom / Local"
4. Enter the fields from the table above
5. Save and reload Windsurf

---

## Verification

After configuring, type a question in Windsurf's chat panel.
You should see a request appear in the proxy terminal window like:

```
[proxy] → qwen2.5-coder:7b | stream=true
[proxy]   messages: 1 | system: true
[proxy] ← response tokens: 312
```

If you see that, Windsurf is fully using your local model.

---

## Claude Code CLI

To use the Claude Code CLI (`claude`) with your local model:

```powershell
# In PowerShell, run before calling claude:
$env:ANTHROPIC_BASE_URL = "http://localhost:3000"
$env:ANTHROPIC_API_KEY  = "local-model"
claude
```

Or add these to your PowerShell profile so they're always set:
```powershell
notepad $PROFILE
# Add the two $env: lines above, save, restart terminal
```
