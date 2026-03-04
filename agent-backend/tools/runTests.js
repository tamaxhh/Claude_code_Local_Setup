/**
 * tools/runTests.js
 * Runs the project's test command and returns output.
 *
 * Tries common test commands in this order:
 *   npm test → pytest → python -m unittest → mvn test
 *
 * Returns: { command, stdout, stderr, exitCode, success }
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const MAX_OUTPUT_CHARS = 5000; // Truncate very long test output

function detectTestCommand(projectRoot) {
    // Check package.json for test script
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified"') {
                return 'npm test';
            }
        } catch { }
    }

    // Check for Python test files
    if (fs.existsSync(path.join(projectRoot, 'pytest.ini')) ||
        fs.existsSync(path.join(projectRoot, 'setup.cfg')) ||
        fs.existsSync(path.join(projectRoot, 'pyproject.toml'))) {
        return 'pytest --tb=short -q';
    }

    // Check for Maven
    if (fs.existsSync(path.join(projectRoot, 'pom.xml'))) {
        return 'mvn test -q';
    }

    // Fallback
    return 'npm test';
}

function runTests(projectRoot, customCommand = null) {
    return new Promise((resolve) => {
        const command = customCommand || detectTestCommand(projectRoot);
        console.log(`[runTests] Running: ${command} in ${projectRoot}`);

        exec(command, { cwd: projectRoot, timeout: 60000 }, (err, stdout, stderr) => {
            const truncate = (str) =>
                str.length > MAX_OUTPUT_CHARS
                    ? str.slice(0, MAX_OUTPUT_CHARS) + `\n... [truncated, ${str.length} chars total]`
                    : str;

            resolve({
                command,
                stdout: truncate(stdout || ''),
                stderr: truncate(stderr || ''),
                exitCode: err?.code ?? 0,
                success: !err || err.code === 0,
            });
        });
    });
}

module.exports = { runTests };
