/**
 * src/commands/explain.ts
 * "LocalAgent: Explain Selection" command.
 * Gets the selected code + surrounding context, sends to agent backend.
 */

import * as vscode from 'vscode';
import { callAgent } from '../client';
import { ResultPanel } from '../panel/ResultPanel';

export function registerExplainCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('claudeLocal.explain', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('LocalAgent: No active editor.');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        if (!selection.trim()) {
            vscode.window.showWarningMessage('LocalAgent: Please select some code first.');
            return;
        }

        const filePath = editor.document.fileName;
        const fullText = editor.document.getText();
        // Grab ±20 lines of surrounding context
        const startLine = Math.max(0, editor.selection.start.line - 20);
        const endLine = Math.min(editor.document.lineCount - 1, editor.selection.end.line + 20);
        const surrounding = editor.document.getText(
            new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length)
        );

        ResultPanel.showLoading('Explaining...');

        try {
            const result = await callAgent({
                question: `Explain what this code does, step by step. Be clear and concise.\n\n\`\`\`\n${selection}\n\`\`\``,
                code_context: { file_path: filePath, selection, surrounding },
                mode: 'local',
            });

            ResultPanel.show(context, '📖 Explanation', result.answer, result.tools_used);
        } catch (err: any) {
            vscode.window.showErrorMessage(`LocalAgent: ${err.message}`);
        }
    });

    context.subscriptions.push(disposable);
}
