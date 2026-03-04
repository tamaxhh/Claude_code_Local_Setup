/**
 * src/commands/refactor.ts
 * "LocalAgent: Refactor Selection" command.
 * Asks the agent to refactor the selected code and shows the result.
 */

import * as vscode from 'vscode';
import { callAgent } from '../client';
import { ResultPanel } from '../panel/ResultPanel';

export function registerRefactorCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('claudeLocal.refactor', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('LocalAgent: No active editor.');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        if (!selection.trim()) {
            vscode.window.showWarningMessage('LocalAgent: Please select the code you want to refactor.');
            return;
        }

        // Ask what kind of refactor they want
        const instruction = await vscode.window.showInputBox({
            prompt: 'What refactoring do you want? (leave blank for general improvements)',
            placeHolder: 'e.g. "use async/await", "extract into smaller functions", "add error handling"',
        });

        if (instruction === undefined) return; // User pressed Escape

        const filePath = editor.document.fileName;
        const lang = editor.document.languageId;
        const startLine = Math.max(0, editor.selection.start.line - 10);
        const endLine = Math.min(editor.document.lineCount - 1, editor.selection.end.line + 10);
        const surrounding = editor.document.getText(
            new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length)
        );

        const question = instruction?.trim()
            ? `Refactor this ${lang} code: ${instruction}. Show the complete refactored version.`
            : `Refactor this ${lang} code for clarity, readability, and best practices. Show the complete refactored version.`;

        ResultPanel.showLoading('Refactoring...');

        try {
            const result = await callAgent({
                question,
                code_context: { file_path: filePath, selection, surrounding },
                mode: 'local',
            });

            ResultPanel.show(context, '🔧 Refactored Code', result.answer, result.tools_used);
        } catch (err: any) {
            vscode.window.showErrorMessage(`LocalAgent: ${err.message}`);
        }
    });

    context.subscriptions.push(disposable);
}
