/**
 * src/commands/implement.ts
 * "LocalAgent: Implement from Instruction" command.
 * User describes what they want; agent searches the codebase and implements it.
 */

import * as vscode from 'vscode';
import { callAgent } from '../client';
import { ResultPanel } from '../panel/ResultPanel';

export function registerImplementCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('claudeLocal.implement', async () => {
        const editor = vscode.window.activeTextEditor;

        // Ask what to implement
        const instruction = await vscode.window.showInputBox({
            prompt: 'What do you want to implement?',
            placeHolder: 'e.g. "Add input validation to the login form", "Create a retry mechanism for API calls"',
        });

        if (!instruction?.trim()) return;

        // Check if there is a selection to use as context
        const selection = editor ? editor.document.getText(editor.selection) : '';
        const filePath = editor?.document.fileName || '';
        const lang = editor?.document.languageId || '';

        // Optionally pick mode
        const modeChoice = await vscode.window.showQuickPick(
            [
                { label: '$(search) Auto (smart)', description: 'Let the agent decide', value: 'auto' },
                { label: '$(file-code) Local only', description: 'Search your codebase only', value: 'local' },
                { label: '$(globe) Web + docs', description: 'Include web docs search', value: 'web' },
            ],
            { placeHolder: 'Search mode?' }
        );

        if (!modeChoice) return;

        const question = selection.trim()
            ? `Implement the following in ${lang}: ${instruction}\n\nUse this as the starting point:\n\`\`\`\n${selection}\n\`\`\``
            : `Implement the following: ${instruction}${lang ? ` (language: ${lang})` : ''}. Provide the complete implementation with all necessary code.`;

        ResultPanel.showLoading('Implementing...');

        try {
            const result = await callAgent({
                question,
                code_context: { file_path: filePath, selection: selection || undefined },
                mode: modeChoice.value as 'auto' | 'local' | 'web',
            });

            ResultPanel.show(context, `⚡ Implementation: ${instruction.slice(0, 50)}`, result.answer, result.tools_used);
        } catch (err: any) {
            vscode.window.showErrorMessage(`LocalAgent: ${err.message}`);
        }
    });

    context.subscriptions.push(disposable);
}
