/**
 * src/extension.ts
 * VS Code extension entry point.
 * Registers all commands and checks backend connectivity on activation.
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { registerExplainCommand } from './commands/explain';
import { registerRefactorCommand } from './commands/refactor';
import { registerImplementCommand } from './commands/implement';

export function activate(context: vscode.ExtensionContext): void {
    console.log('Claude Local Agent extension is activating...');

    // Register all commands
    registerExplainCommand(context);
    registerRefactorCommand(context);
    registerImplementCommand(context);

    // Check backend connectivity (non-blocking)
    checkBackend();

    console.log('Claude Local Agent extension is active.');
}

export function deactivate(): void {
    // Nothing to clean up
}

async function checkBackend(): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeLocal');
    const backendUrl = config.get<string>('backendUrl') || 'http://localhost:4000';

    try {
        await axios.get(backendUrl, { timeout: 3000 });
        vscode.window.setStatusBarMessage('$(check) LocalAgent: ready', 5000);
    } catch {
        // Show a subtle warning — don't block the user
        const choice = await vscode.window.showWarningMessage(
            `Claude Local Agent: backend not reachable at ${backendUrl}. Is it running?`,
            'Open Terminal',
            'Dismiss'
        );
        if (choice === 'Open Terminal') {
            vscode.commands.executeCommand('workbench.action.terminal.new');
        }
    }
}
