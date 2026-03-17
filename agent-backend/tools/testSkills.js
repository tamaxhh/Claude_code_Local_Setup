const { searchSkills } = require('./searchSkills');
const { executeSkill } = require('./executeSkill');
const { createSkill } = require('./createSkill');

async function testSkills() {
  console.log('--- Testing Self-Extending Skills ---');
  
  // Test create
  const newSkill = await createSkill('explain redis in node js');
  console.log('Created:', newSkill.skillName);
  
  // Test search & execute
  const matches = await searchSkills('redis node');
  console.log('Matches:', matches.map(m => m.file));
  
  if (matches[0]) {
    const result = await executeSkill(matches[0].file, 'basic redis cache example');
    console.log('Executed:', result.slice(0, 200));
  }
}

if (require.main === module) {
  testSkills().catch(console.error);
}

module.exports = { testSkills };
