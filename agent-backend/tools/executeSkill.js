const fs = require('fs-extra');
const path = require('path');

async function executeSkill(skillName, query, repoRoot = process.cwd()) {
  try {
    const skillPath = path.join(process.cwd(), `skills/${skillName}.js`);
    if (!await fs.pathExists(skillPath)) {
      throw new Error(`Skill module ${skillName}.js not found`);
    }

    // Dynamic import for safety
    const { execute } = await import(skillPath);
    return await execute(query, repoRoot);
  } catch (e) {
    console.warn(`[executeSkill ${skillName}] Error:`, e.message);
    throw e;
  }
}

module.exports = { executeSkill };
