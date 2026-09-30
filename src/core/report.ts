import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { detectProject } from './projectDetector.js';
import { readProgress, currentIndex } from './progress.js';
import { detectPhase } from './apply.js';
import { runDoctor } from './doctor.js';
import { runAgentDoctor, installedHelenSkills } from './agentDoctor.js';

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
  const healthBadgeColor = data.health.errors > 0 ? '#ef4444' : data.health.warnings > 0 ? '#f59e0b' : '#10b981';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HELEN Project Dashboard - ${data.project.name}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 2rem 1rem; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; }
    h1 { font-size: 1.8rem; font-weight: 700; color: var(--accent); }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.5rem; }
    .card h2 { font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat { font-size: 2rem; font-weight: 700; color: var(--text); }
    .progress-bar-container { background: #334155; height: 10px; border-radius: 9999px; overflow: hidden; margin-top: 0.75rem; }
    .progress-bar { background: var(--accent); height: 100%; border-radius: 9999px; transition: width 0.3s ease; }
    .list { list-style: none; }
    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .list-item:last-child { border-bottom: none; }
    .status-ok { color: #10b981; }
    .status-warn { color: #f59e0b; }
    .status-error { color: #ef4444; }
    .step-badge { width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; margin-right: 0.5rem; }
    .step-done { background: #10b981; color: #fff; }
    .step-pending { background: #475569; color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>HELEN Project Dashboard</h1>
        <p style="color: var(--text-muted);">Repository: <strong>${data.project.name}</strong> • Framework: <strong>${data.project.framework}</strong> • Generated: ${new Date(data.generatedAt).toLocaleString()}</p>
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
        <div class="stat">${data.phase.current}</div>
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
              <strong>[${s.kind}] ${s.ref}</strong>
              <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.5rem;">${s.why}</span>
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
            <span><strong>${c.label}</strong>: ${c.message}</span>
            <span class="status-${c.status}">
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
  const data = generateReportData(cwd);
  const html = renderReportHtml(data);
  const helenDir = path.join(cwd, '.helen');
  if (!fs.existsSync(helenDir)) {
    fs.mkdirSync(helenDir, { recursive: true });
  }
  const filePath = path.join(helenDir, 'report.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  return { data, filePath };
}

export function openInBrowser(filePath: string): void {
  const startCmd = process.platform === 'win32' ? `start "" "${filePath}"` : process.platform === 'darwin' ? `open "${filePath}"` : `xdg-open "${filePath}"`;
  exec(startCmd);
}
