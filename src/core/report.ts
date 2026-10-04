import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { detectProject } from './projectDetector.js';
import { readProgress, currentIndex } from './progress.js';
import { detectPhase } from './apply.js';
import { runDoctor } from './doctor.js';
import { runAgentDoctor, installedHelenSkills } from './agentDoctor.js';
import { isSafeProjectPath } from './fs.js';

export interface HelenReportData {
  generatedAt: string;
  project: {
    name: string;
    framework: string;
    packageManager: string;
    hasGit: boolean;
    hasTypeScript: boolean;
  };
  phase: {
    current: string;
    evidence: string[];
    progressPercentage: number;
    goal?: string;
    currentStep?: number;
    totalSteps?: number;
  };
  steps: Array<{
    number: number;
    kind: string;
    ref: string;
    why: string;
    status: string;
    isCheckpoint: boolean;
  }>;
  health: {
    total: number;
    passed: number;
    warnings: number;
    errors: number;
    checks: Array<{ label: string; status: string; message: string }>;
  };
  skills: Array<{
    name: string;
    dir: string;
    outdated: boolean;
  }>;
}

export function generateReportData(cwd: string = process.cwd()): HelenReportData {
  const project = detectProject(cwd);
  const progress = readProgress(cwd);
  const detected = detectPhase(cwd);
  const doctorChecks = [...runDoctor(cwd), ...runAgentDoctor(cwd)];
  const installedSkills = installedHelenSkills(cwd);

  const passed = doctorChecks.filter(c => c.status === 'ok').length;
  const warnings = doctorChecks.filter(c => c.status === 'warn').length;
  const errors = doctorChecks.filter(c => c.status === 'error').length;

  let progressPercentage = 0;
  let steps: HelenReportData['steps'] = [];

  if (progress && progress.steps.length > 0) {
    const completedCount = progress.steps.filter(s => s.status === 'done').length;
    progressPercentage = Math.round((completedCount / progress.steps.length) * 100);
    steps = progress.steps.map((s, idx) => ({
      number: idx + 1,
      kind: s.kind,
      ref: s.ref,
      why: s.why,
      status: s.status,
      isCheckpoint: s.kind === 'checkpoint',
    }));
  }

  const activeIdx = progress ? currentIndex(progress) : -1;

  return {
    generatedAt: new Date().toISOString(),
    project: {
      name: project.name,
      framework: project.framework,
      packageManager: project.packageManager,
      hasGit: project.hasGit,
      hasTypeScript: project.hasTypeScript,
    },
    phase: {
      current: progress ? progress.goal : detected.phase,
      evidence: detected.evidence,
      progressPercentage,
      goal: progress?.goal,
      currentStep: activeIdx !== -1 ? activeIdx + 1 : undefined,
      totalSteps: progress?.steps.length,
    },
    steps,
    health: {
      total: doctorChecks.length,
      passed,
      warnings,
      errors,
      checks: doctorChecks.map(c => ({
        label: c.label,
        status: c.status,
        message: c.message,
      })),
    },
    skills: installedSkills.map(s => ({
      name: s.name,
      dir: s.dir,
      outdated: s.outdated,
    })),
  };
}

export function renderReportHtml(data: HelenReportData): string {
  const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
  const healthBadgeColor = data.health.errors > 0 ? '#ef4444' : data.health.warnings > 0 ? '#f59e0b' : '#10b981';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HELEN Project Dashboard - ${escapeHtml(data.project.name)}</title>
  <style>
    :root {
      --bg: #FAFAFA;
      --card: #FFFFFF;
      --text: #111111;
      --text-muted: #666666;
      --accent: #000000;
      --border: #E5E5E5;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0A0A0A;
        --card: #111111;
        --text: #F3F4F6;
        --text-muted: #9CA3AF;
        --accent: #FFFFFF;
        --border: #27272A;
        --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: var(--font-sans); padding: 3rem 1.5rem; line-height: 1.6; font-size: 15px; -webkit-font-smoothing: antialiased; }
    .container { max-width: 1024px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 3rem; }
    h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-family: var(--font-mono); font-weight: 600; text-transform: uppercase; border: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    header { flex-wrap: wrap; gap: 1rem; }
    .card, .list-item > * { min-width: 0; overflow-wrap: anywhere; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.75rem; box-shadow: var(--shadow); transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
    .card h2 { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .stat { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.04em; color: var(--text); font-variant-numeric: tabular-nums; }
    .progress-bar-container { background: var(--border); height: 6px; border-radius: 3px; overflow: hidden; margin-top: 1rem; }
    .progress-bar { background: var(--accent); height: 100%; border-radius: 3px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
    .list { list-style: none; }
    .list-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 0; border-bottom: 1px dashed var(--border); gap: 1rem; }
    .list-item:last-child { border-bottom: none; }
    .status-ok { color: #059669; font-weight: 600; }
    .status-warn { color: #D97706; font-weight: 600; }
    .status-error { color: #DC2626; font-weight: 600; }
    @media (prefers-color-scheme: dark) {
      .status-ok { color: #10B981; }
      .status-warn { color: #F59E0B; }
      .status-error { color: #EF4444; }
    }
    .step-badge { min-width: 28px; height: 28px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; font-family: var(--font-mono); }
    .step-done { background: var(--text); color: var(--bg); }
    .step-pending { background: var(--border); color: var(--text-muted); }
    .mono-text { font-family: var(--font-mono); font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>HELEN Project Dashboard</h1>
        <p style="color: var(--text-muted);">Repository: <strong>${escapeHtml(data.project.name)}</strong> • Framework: <strong>${escapeHtml(data.project.framework)}</strong> • Generated: ${new Date(data.generatedAt).toLocaleString()}</p>
      </div>
      <div>
        <span class="badge" style="background: ${healthBadgeColor}22; color: ${healthBadgeColor}; border: 1px solid ${healthBadgeColor};">
          Health: ${data.health.passed}/${data.health.total} Passed
        </span>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Phase & Progress</h2>
        <div class="stat">${escapeHtml(data.phase.current)}</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">${data.phase.progressPercentage}% Completed</p>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${data.phase.progressPercentage}%;"></div>
        </div>
      </div>

      <div class="card">
        <h2>Quality Gates & Guardrails</h2>
        <div style="display: flex; gap: 1.5rem;">
          <div><div class="stat" style="color: #10b981;">${data.health.passed}</div><span style="font-size: 0.85rem; color: var(--text-muted);">Passing</span></div>
          <div><div class="stat" style="color: #f59e0b;">${data.health.warnings}</div><span style="font-size: 0.85rem; color: var(--text-muted);">Warnings</span></div>
          <div><div class="stat" style="color: #ef4444;">${data.health.errors}</div><span style="font-size: 0.85rem; color: var(--text-muted);">Errors</span></div>
        </div>
      </div>

      <div class="card">
        <h2>Skills Inventory</h2>
        <div class="stat">${data.skills.length}</div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">HELEN Agent Skills Active</p>
      </div>
    </div>

    ${data.steps.length > 0 ? `
    <div class="card" style="margin-bottom: 2rem;">
      <h2>Playbook Steps (${data.steps.length} total)</h2>
      <ul class="list">
        ${data.steps.map(s => `
          <li class="list-item">
            <div>
              <span class="step-badge ${s.status === 'done' ? 'step-done' : 'step-pending'}">${s.status === 'done' ? '✓' : s.number}</span>
              <strong>[${escapeHtml(s.kind)}] ${escapeHtml(s.ref)}</strong>
              <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.5rem;">${escapeHtml(s.why)}</span>
            </div>
            <span style="font-size: 0.85rem; color: var(--text-muted);">${s.isCheckpoint ? 'Checkpoint' : 'Task'}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="card">
      <h2>System & Repository Health</h2>
      <ul class="list">
        ${data.health.checks.map(c => `
          <li class="list-item">
            <span><strong>${escapeHtml(c.label)}</strong>: ${escapeHtml(c.message)}</span>
            <span class="status-${c.status === 'ok' ? 'ok' : c.status === 'warn' ? 'warn' : 'error'}">
              ${c.status === 'ok' ? '✓ Pass' : c.status === 'warn' ? '⚠ Warn' : '✗ Fail'}
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
}

export function writeReport(cwd: string = process.cwd()): { data: HelenReportData; filePath: string } {
  const filePath = path.join(cwd, '.helen', 'report.html');
  if (!isSafeProjectPath(cwd, filePath)) throw new Error('Report file must remain inside the project directory');
  const data = generateReportData(cwd);
  const html = renderReportHtml(data);
  const helenDir = path.join(cwd, '.helen');
  if (!fs.existsSync(helenDir)) {
    fs.mkdirSync(helenDir, { recursive: true });
  }
  fs.writeFileSync(filePath, html, 'utf-8');
  return { data, filePath };
}

export function openInBrowser(filePath: string): void {
  const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(command, [path.resolve(filePath)], error => {
    if (error) console.error(`Could not open report: ${error.message}`);
  });
}
