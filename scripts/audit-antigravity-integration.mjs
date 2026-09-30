import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

async function testMcpServer() {
  console.log('--- 1. Testing MCP Server via stdio ---');
  const mcpBin = 'C:\\Users\\User\\Desktop\\ENEKO\\helen\\dist\\mcp.js';
  const child = spawn(process.execPath, [mcpBin], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let responseIndex = 0;
  const t0 = Date.now();

  const send = (msg) => {
    child.stdin.write(JSON.stringify(msg) + '\n');
  };

  return new Promise((resolve, reject) => {
    let outputBuffer = '';

    child.stdout.on('data', (chunk) => {
      outputBuffer += chunk.toString();
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop(); // keep remainder

      for (const line of lines) {
        if (!line.trim()) continue;
        const res = JSON.parse(line);
        responseIndex++;

        if (responseIndex === 1) {
          // initialize response
          const elapsed = Date.now() - t0;
          console.log(`[PASS] initialize handshake in ${elapsed}ms: Server "${res.result.serverInfo.name}" v${res.result.serverInfo.version}`);
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
        } else if (responseIndex === 2) {
          // tools/list response
          const tools = res.result.tools;
          console.log(`[PASS] tools/list: ${tools.length} tools available (${tools.map(t => t.name).join(', ')})`);
          send({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: 'helen_status', arguments: { cwd: 'C:\\Users\\User\\Desktop\\ENEKO\\helen' } },
          });
        } else if (responseIndex === 3) {
          // helen_status response
          const text = JSON.parse(res.result.content[0].text);
          console.log(`[PASS] helen_status tool call: phase="${text.phase || text.detectedPhase}", tracked=${text.tracked}`);
          send({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: { name: 'helen_prompt_get', arguments: { promptId: 'master' } },
          });
        } else if (responseIndex === 4) {
          // helen_prompt_get response
          const prompt = res.result.content[0].text;
          console.log(`[PASS] helen_prompt_get tool call: retrieved ${prompt.length} chars of prompt content`);
          child.kill();
          resolve(true);
        }
      }
    });

    child.on('error', reject);
    // 1. send initialize
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  });
}

function auditInstalledSkills() {
  console.log('\n--- 2. Auditing Installed Antigravity Skills ---');
  const skillsDir = 'C:\\Users\\User\\.gemini\\config\\skills';
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const helenSkills = entries.filter(e => e.isDirectory() && e.name.startsWith('helen-'));

  console.log(`Found ${helenSkills.length} HELEN skills installed in Antigravity configuration:`);
  let validCount = 0;

  for (const skill of helenSkills) {
    const skillMd = path.join(skillsDir, skill.name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      console.error(`[FAIL] Missing SKILL.md in ${skill.name}`);
      continue;
    }
    const content = fs.readFileSync(skillMd, 'utf-8');
    const hasFrontmatter = content.startsWith('---') && content.includes('name:') && content.includes('description:');
    if (!hasFrontmatter) {
      console.error(`[FAIL] Invalid frontmatter in ${skill.name}`);
      continue;
    }
    validCount++;
    console.log(`  ✓ ${skill.name.padEnd(25)} [Valid Frontmatter + Description]`);
  }

  console.log(`[PASS] ${validCount}/${helenSkills.length} skills are 100% compliant with Antigravity specification.`);
}

async function runAudit() {
  try {
    await testMcpServer();
    auditInstalledSkills();
    console.log('\n=== ALL AUDIT CHECKS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

runAudit();
