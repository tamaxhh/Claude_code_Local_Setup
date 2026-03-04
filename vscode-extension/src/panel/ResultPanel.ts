/**
 * src/panel/ResultPanel.ts
 * A WebView panel that shows the agent's response with Markdown rendering.
 */

import * as vscode from 'vscode';

export class ResultPanel {
    private static panel: vscode.WebviewPanel | undefined;

    static show(context: vscode.ExtensionContext, title: string, markdownContent: string, toolsUsed: string[]): void {
        if (ResultPanel.panel) {
            ResultPanel.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            ResultPanel.panel = vscode.window.createWebviewPanel(
                'claudeLocalResult',
                'Claude Local Agent',
                vscode.ViewColumn.Beside,
                { enableScripts: true, retainContextWhenHidden: true }
            );
            ResultPanel.panel.onDidDispose(() => { ResultPanel.panel = undefined; });
        }

        ResultPanel.panel.title = title;
        ResultPanel.panel.webview.html = ResultPanel.buildHtml(title, markdownContent, toolsUsed);
    }

    static showLoading(title: string): void {
        if (!ResultPanel.panel) {
            ResultPanel.panel = vscode.window.createWebviewPanel(
                'claudeLocalResult',
                'Claude Local Agent',
                vscode.ViewColumn.Beside,
                { enableScripts: true, retainContextWhenHidden: true }
            );
            ResultPanel.panel.onDidDispose(() => { ResultPanel.panel = undefined; });
        }
        ResultPanel.panel.title = title;
        ResultPanel.panel.webview.html = ResultPanel.buildLoadingHtml(title);
    }

    private static buildLoadingHtml(title: string): string {
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
           background: var(--vscode-editor-background); padding: 24px; }
    .spinner { display: flex; align-items: center; gap: 12px; margin-top: 40px; }
    .dot { width:10px; height:10px; border-radius:50%; background:#569cd6;
           animation: bounce 1.2s infinite ease-in-out; }
    .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
    @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
  </style>
</head>
<body>
  <h2>🤖 ${title}</h2>
  <div class="spinner">
    <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    <span>Thinking...</span>
  </div>
</body>
</html>`;
    }

    private static buildHtml(title: string, content: string, toolsUsed: string[]): string {
        // Escape HTML to prevent injection, then convert basic markdown manually
        const escaped = content
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Convert code blocks, bold, inline code in the escaped text
        const rendered = escaped
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\n\n/g, '</p><p>');

        const toolChips = toolsUsed.map((t) => `<span class="chip">${t}</span>`).join(' ');

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: var(--vscode-font-family); font-size: 14px;
           color: var(--vscode-foreground); background: var(--vscode-editor-background);
           padding: 20px 28px; line-height: 1.6; max-width: 860px; margin: 0 auto; }
    h1,h2,h3 { color: var(--vscode-textLink-foreground); margin-top: 1.4em; }
    pre { background: var(--vscode-textCodeBlock-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px; padding: 12px 16px; overflow-x: auto; }
    code { font-family: var(--vscode-editor-font-family, monospace); font-size: 13px; }
    p > code { background: var(--vscode-textCodeBlock-background);
               padding: 1px 5px; border-radius: 3px; }
    .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
               margin-bottom: 16px; padding-bottom: 12px;
               border-bottom: 1px solid var(--vscode-panel-border); }
    .chip { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
            padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .model-badge { font-size: 11px; color: var(--vscode-descriptionForeground); margin-left: auto; }
    strong { color: var(--vscode-textPreformat-foreground); }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>🤖 ${title}</strong>
    ${toolChips}
    <span class="model-badge">local model</span>
  </div>
  <div class="content"><p>${rendered}</p></div>
</body>
</html>`;
    }
}
