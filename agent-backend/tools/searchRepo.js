/**
 * tools/searchRepo.js
 * Searches your workspace code files for a given query.
 * Uses Node's built-in fs + glob for cross-platform support.
 *
 * Returns: Array of { filePath, lineNumber, lineContent } matches (max 30)
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', 'out', '.next', '__pycache__'];
const CODE_EXTENSIONS = [
    '*.js', '*.ts', '*.jsx', '*.tsx', '*.py', '*.java', '*.cs',
    '*.go', '*.rb', '*.php', '*.cpp', '*.c', '*.h', '*.rs',
    '*.json', '*.yaml', '*.yml', '*.md', '*.env.example',
];

async function searchRepo(query, workspaceRoot, maxResults = 30) {
    if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
        return { error: `Workspace root not found: ${workspaceRoot}` };
    }

    const results = [];
    const queryLower = query.toLowerCase();

    // Build glob patterns for all code files
    const patterns = CODE_EXTENSIONS.map((ext) => `**/${ext}`);
    const ignorePatterns = IGNORED_DIRS.map((dir) => `**/${dir}/**`);

    try {
        const files = await glob(patterns, {
            cwd: workspaceRoot,
            ignore: ignorePatterns,
            nodir: true,
            absolute: true,
        });

        for (const filePath of files) {
            if (results.length >= maxResults) break;

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');

                lines.forEach((line, i) => {
                    if (results.length < maxResults && line.toLowerCase().includes(queryLower)) {
                        results.push({
                            filePath: path.relative(workspaceRoot, filePath).replace(/\\/g, '/'),
                            lineNumber: i + 1,
                            lineContent: line.trim(),
                        });
                    }
                });
            } catch {
                // Skip unreadable files (binary, permission denied, etc.)
            }
        }

        return {
            query,
            totalMatches: results.length,
            results,
        };
    } catch (err) {
        return { error: `Search failed: ${err.message}` };
    }
}

module.exports = { searchRepo };
