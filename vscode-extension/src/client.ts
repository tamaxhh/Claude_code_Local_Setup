// client.ts — VS Code extension agent client

import * as vscode from 'vscode';

const AGENT_URL = vscode.workspace.getConfiguration('localAI').get<string>('agentUrl') || 'http://localhost:4000';

export interface AgentResponse {
  answer : string;
  context: { repoHits: number; webChunks: number };
}

/**
 * Send a query to the agent backend.
 */
export async function queryAgent(
  query       : string,
  selectedCode: string = '',
  repoRoot    : string = '',
): Promise<AgentResponse> {
  const body = JSON.stringify({ query, selectedCode, repoRoot });

  const response = await fetch(`${AGENT_URL}/agent/complete`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Agent error ${response.status}: ${err}`);
  }

  return response.json() as Promise<AgentResponse>;
}

/**
 * Get selected code from active editor.
 */
export function getSelectedCode(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return '';
  const selection = editor.selection;
  return selection.isEmpty ? '' : editor.document.getText(selection);
}

/**
 * Get workspace root path.
 */
export function getRepoRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
}

/**
 * Render the agent response in a webview panel.
 */
export function renderResponse(panel: vscode.WebviewPanel, result: AgentResponse) {
  const { answer, context } = result;

  const meta = `<p style="color:#888;font-size:12px">
    📂 ${context.repoHits} repo hit(s) · 🌐 ${context.webChunks} web chunk(s)
  </p>`;

  // Convert markdown-ish code blocks to <pre><code>
  const html = escapeAndFormat(answer);

  panel.webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); padding: 16px; line-height: 1.6; }
  pre  { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 4px; overflow-x: auto; }
  code { font-family: var(--vscode-editor-font-family); font-size: 13px; }
  p    { margin: 0 0 12px; }
</style>
</head>
<body>${meta}${html}</body>
</html>`;
}

function escapeAndFormat(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>')
    .replace(/```(\\w*)\\n([\\s\\S]*?)```/g, function(m, lang, code) {
      return `<pre><code>${code.trim()}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\\n/g, '<br>');
}

