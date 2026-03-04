/**
 * src/client.ts
 * HTTP client that calls the agent backend.
 */

import axios from 'axios';
import * as vscode from 'vscode';

export interface AgentRequest {
    question: string;
    code_context?: {
        file_path?: string;
        selection?: string;
        surrounding?: string;
    };
    mode?: 'auto' | 'local' | 'web';
    workspace_root?: string;
}

export interface AgentResponse {
    answer: string;
    tools_used: string[];
    context_summary: string;
}

export async function callAgent(request: AgentRequest): Promise<AgentResponse> {
    const config = vscode.workspace.getConfiguration('claudeLocal');
    const backendUrl = config.get<string>('backendUrl') || 'http://localhost:4000';
    const mode = config.get<string>('defaultMode') || 'auto';

    const workspaceRoot = config.get<string>('workspaceRoot') ||
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    try {
        const res = await axios.post<AgentResponse>(`${backendUrl}/agent/complete`, {
            ...request,
            mode: request.mode || mode,
            workspace_root: workspaceRoot,
        }, { timeout: 120_000 });

        return res.data;
    } catch (err: any) {
        const detail = err.response?.data?.error || err.message;
        throw new Error(`Agent backend error: ${detail}`);
    }
}
