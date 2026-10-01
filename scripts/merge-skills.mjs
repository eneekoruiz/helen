import fs from 'fs';
import path from 'path';

const mappings = {
  'helen-impeccable': 'helen-audit',
  'helen-improve': 'helen-audit',
  'helen-qa-scale': 'helen-audit',
  'helen-clean-code': 'helen-audit',
  'helen-review': 'helen-audit',
  'helen-premium-design': 'helen-design',
  'helen-anti-slop': 'helen-design',
  'helen-motion-3d': 'helen-design',
  'helen-a11y-perf': 'helen-design',
  'helen-data-api': 'helen-backend',
  'helen-copy-cro': 'helen-copy',
  'helen-seo-compliance': 'helen-release',
  'helen-client-handoff': 'helen-release',
  'helen-onboarding': 'helen-knowledge'
};

const pPath = path.join('docs', 'prompts', 'playbooks.json');
let content = fs.readFileSync(pPath, 'utf-8');

for (const [old, newName] of Object.entries(mappings)) {
  content = content.replaceAll(`"ref": "${old}"`, `"ref": "${newName}"`);
}
fs.writeFileSync(pPath, content);
console.log('playbooks.json updated.');

// Also update SKILLS_QUALITY.md
const qPath = path.join('docs', 'SKILLS_QUALITY.md');
if (fs.existsSync(qPath)) {
  let qContent = fs.readFileSync(qPath, 'utf-8');
  for (const [old, newName] of Object.entries(mappings)) {
    qContent = qContent.replaceAll(old, newName);
  }
  fs.writeFileSync(qPath, qContent);
  console.log('SKILLS_QUALITY.md updated.');
}

// Update tests
const tPath = path.join('tests', 'skills.test.ts');
if (fs.existsSync(tPath)) {
  let tContent = fs.readFileSync(tPath, 'utf-8');
  for (const [old, newName] of Object.entries(mappings)) {
    tContent = tContent.replaceAll(old, newName);
  }
  fs.writeFileSync(tPath, tContent);
  console.log('skills.test.ts updated.');
}
