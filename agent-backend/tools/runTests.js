// tools/runTests.js
// Run tests in the repo root.

async function runTests(repoRoot) {
  try {
    const { execSync } = require('child_process');
    const output = execSync('npm test || yarn test || pnpm test || echo "No test runner found"', { cwd: repoRoot, timeout: 30000 }).toString();
    return output;
  } catch (err) {
    return `Tests failed or no tests found: ${err.message}`;
  }
}

module.exports = { runTests };

