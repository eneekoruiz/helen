#!/usr/bin/env node
/**
 * Orca Handoff Automation Script
 * Executed by agents or developers when approaching quota limits (3-5% margin)
 * to cleanly checkpoint work into Git, evaluate task nature, recommend the optimal
 * target AI and exact model, and hand off to the next agent in the Orca fleet.
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const specifiedAgent = process.argv[2];
const customNote = process.argv.slice(3).join(' ') || 'Automatic handoff before quota limit reached.';

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', ...opts }).trim();
  } catch {
    return null;
  }
}

function resolveOrcaExecutable() {
  const winDefault = 'C:\\Users\\User\\AppData\\Local\\Programs\\Orca\\resources\\bin\\orca.cmd';
  if (fs.existsSync(winDefault)) return winDefault;
  return 'orca';
}

function detectCurrentAgent() {
  if (process.env.HELEN_AGENT) return process.env.HELEN_AGENT.toLowerCase();
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_SESSION_ID) return 'claude';
  if (process.env.GEMINI_API_KEY || process.env.ANTIGRAVITY_BRAIN_DIR) return 'agy';
  return 'claude';
}

function recommendTargetAI(currentAgent, activeGoal, diffStat) {
  const text = `${activeGoal} ${diffStat}`.toLowerCase();
  const isHighComplexity = /\b(architecture|refactor|concurrency|race|memory|security|auth|crypto|migration|database|sql|perf|algo)\b/.test(text);
  const isFrontendOrDesign = /\b(ui|ux|design|css|tailwind|html|component|screen|view|layout|react|vite)\b/.test(text);
  const isDocumentationOrTests = /\b(doc|readme|comment|test|vitest|jest|spec|typing|typecheck)\b/.test(text);

  let recommendation = {
    targetAgent: 'codex',
    model: 'OpenAI o3-mini (High reasoning) o gpt-4o',
    reason: 'La tarea contiene componentes de lógica o refactorización; Codex con modelos de razonamiento ofrece alta precisión.',
  };

  if (currentAgent === 'claude') {
    if (isHighComplexity) {
      recommendation = {
        targetAgent: 'codex',
        model: 'OpenAI o3-mini (High reasoning) o gpt-4o',
        reason: 'Cuota de Anthropic agotándose. La tarea es de alta complejidad algorítmica/concurrente; o3-mini garantiza deducción estricta sin consumir cuota de Claude.',
      };
    } else if (isDocumentationOrTests) {
      recommendation = {
        targetAgent: 'agy',
        model: 'Google Gemini 2.0 Flash / Gemini 1.5 Pro',
        reason: 'Cuota de Anthropic agotándose. La tarea involucra tests/documentación/cobertura; Gemini ofrece gran velocidad, coste token-lean y ventana de contexto masiva.',
      };
    } else {
      recommendation = {
        targetAgent: 'codex',
        model: 'OpenAI gpt-4o',
        reason: 'Cuota de Anthropic agotándose. Handoff balanceado a Codex para completar implementación y verificación general.',
      };
    }
  } else if (currentAgent === 'codex') {
    if (isFrontendOrDesign) {
      recommendation = {
        targetAgent: 'claude',
        model: 'Anthropic Claude 3.7 Sonnet',
        reason: 'Cuota de OpenAI agotándose. Claude 3.7 Sonnet sobresale en maquetación frontend, diseño anti-slop y consistencia de estilos.',
      };
    } else {
      recommendation = {
        targetAgent: 'agy',
        model: 'Google Gemini 1.5 Pro / Gemini 2.0 Flash',
        reason: 'Cuota de OpenAI agotándose. Antigravity cuenta con cuota disponible y excelente capacidad para refactorización iterativa.',
      };
    }
  } else {
    // currentAgent is agy
    if (isFrontendOrDesign) {
      recommendation = {
        targetAgent: 'claude',
        model: 'Anthropic Claude 3.7 Sonnet',
        reason: 'Cuota de Antigravity agotándose. Claude 3.7 Sonnet proporciona máxima calidad en arquitectura de componentes y diseño UI.',
      };
    } else {
      recommendation = {
        targetAgent: 'codex',
        model: 'OpenAI o3-mini / gpt-4o',
        reason: 'Cuota de Antigravity agotándose. Codex ofrece resolución robusta de lógica de negocio y pruebas unitarias.',
      };
    }
  }

  return recommendation;
}

// 1. Check git status and commit atomically
console.log(`\n[Orca Handoff] Checking working tree state...`);
const porcelain = run('git status --porcelain');
let committed = false;
if (porcelain && porcelain.length > 0) {
  console.log('[Orca Handoff] Staging uncommitted changes...');
  run('git add -A');
  const commitRes = run('git commit -m "chore(handoff): checkpoint before quota limit"');
  if (commitRes !== null) {
    console.log('[Orca Handoff] Atomic WIP commit created.');
    committed = true;
  }
} else {
  console.log('[Orca Handoff] Working tree is clean.');
}

// 2. Collect git metadata
const branch = run('git rev-parse --abbrev-ref HEAD') || 'unknown';
const lastCommit = run('git log -1 --oneline') || 'none';
const diffStat = run('git diff --stat HEAD~1 HEAD') || 'No recent diff available';

// 3. Inspect Helen progress if available
let activeGoal = 'General task continuation';
const progressPath = path.join(cwd, '.helen', 'progress.json');
if (fs.existsSync(progressPath)) {
  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    if (progress.goal) activeGoal = progress.goal;
  } catch {
    // Non-fatal if Helen progress is absent or corrupted
  }
}

// 4. Determine recommendation
const currentAgent = detectCurrentAgent();
const rec = recommendTargetAI(currentAgent, activeGoal, diffStat);
const targetAgent = specifiedAgent || rec.targetAgent;

console.log(`\n======================================================`);
console.log(`🤖 RECOMENDACIÓN DE RELEVO INTELIGENTE (CUOTA 3-5%):`);
console.log(`  • Agente emisor: ${currentAgent.toUpperCase()}`);
console.log(`  • IA recomendada: ${rec.targetAgent.toUpperCase()}`);
console.log(`  • Modelo exacto: ${rec.model}`);
console.log(`  • Justificación: ${rec.reason}`);
console.log(`======================================================\n`);

// 5. Generate .orca-handoff.md
const handoffContent = `# Orca Handoff Checkpoint

- **Generated At**: ${new Date().toISOString()}
- **Emitting Agent**: \`${currentAgent}\`
- **Git Branch**: \`${branch}\`
- **Last Commit**: \`${lastCommit}\`
- **Recommended Target Agent**: \`${rec.targetAgent}\`
- **Recommended Exact Model**: \`${rec.model}\`
- **Model Recommendation Rationale**: ${rec.reason}
- **Active Target Agent**: \`${targetAgent}\`
- **WIP Commit Created**: ${committed ? 'Yes' : 'No (Tree was clean)'}

## 1. Goal & Context
${activeGoal}

**Note**: ${customNote}

## 2. Recent Changes
\`\`\`text
${diffStat}
\`\`\`

## 3. Why this Model for \`${targetAgent}\`
> **Recomendación fundamentada**: ${rec.reason}

## 4. Immediate Next Steps for \`${targetAgent}\`
1. Review the latest commit and changed files.
2. Run project tests and quality checks to verify baseline state.
3. Complete the pending requirements and verify before final commit.

## 5. Continuation Command
\`\`\`bash
orca dispatch --agent ${targetAgent} --cwd "${cwd}" "Continúa la tarea revisando .orca-handoff.md"
\`\`\`
`;

const handoffFilePath = path.join(cwd, '.orca-handoff.md');
fs.writeFileSync(handoffFilePath, handoffContent, 'utf-8');
console.log(`[Orca Handoff] Checkpoint written to: ${handoffFilePath}`);

// 6. Check if Orca CLI is available and dispatch if Orca runtime is active
const orcaBin = resolveOrcaExecutable();
let orcaReachable = false;
try {
  const orcaStatusRaw = run(`"${orcaBin}" status --json`);
  if (orcaStatusRaw) {
    const status = JSON.parse(orcaStatusRaw);
    if (status?.result?.app?.running || status?.result?.runtime?.reachable) {
      orcaReachable = true;
    }
  }
} catch {
  // Non-fatal if Orca status cannot be queried
}

if (orcaReachable) {
  console.log(`[Orca Handoff] Orca runtime is reachable. Dispatching lane for ${targetAgent}...`);
  const dispatchRes = spawnSync(
    orcaBin,
    ['dispatch', '--agent', targetAgent, '--cwd', cwd, 'Continúa la tarea revisando .orca-handoff.md'],
    { stdio: 'inherit', cwd, shell: true }
  );
  if (dispatchRes.status === 0) {
    console.log(`[Orca Handoff] Successfully dispatched to ${targetAgent} via Orca CLI!`);
  } else {
    console.warn(`[Orca Handoff] Dispatch command exited with code ${dispatchRes.status}.`);
  }
} else {
  console.log(`\n[Orca Handoff] Orca desktop runtime is not currently running.`);
  console.log(`To resume with ${targetAgent} (${rec.model}), start Orca ('orca open') or execute:`);
  console.log(`  orca dispatch --agent ${targetAgent} --cwd "${cwd}" "Continúa la tarea revisando .orca-handoff.md"\n`);
}
