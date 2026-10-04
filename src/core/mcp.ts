import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import { readProgress, formatStatus, formatNext, markDone, currentIndex, startProgress, resumeProgress } from './progress.js';
import { buildPlan, readPlaybooks, detectPhase, formatBrief } from './apply.js';
import { workProfile, repositoryFingerprint } from './workflowContext.js';
import { runDoctor } from './doctor.js';
import type { DoctorFixReport } from './doctorFix.js';
import { listPromptEntries, readPrompt, searchPrompts } from './prompts.js';
import { listSkills } from './skills.js';
import { runInitProject } from './initProject.js';
import { parseFrontmatter } from './frontmatter.js';
import { installedHelenSkills, runAgentDoctor } from './agentDoctor.js';
import { withStderrLogging } from './logger.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export const HELEN_MCP_TOOLS: McpTool[] = [
  {
    name: 'helen_resume',
    description: 'Resume recorded progress and decisions, with current or stale verification and a concise next action.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Project directory (defaults to current working directory)' },
        decision: { type: 'string', description: 'Optional durable project decision to record' },
      },
    },
  },
  {
    name: 'helen_status',
    description: 'Inspect the current project phase, tracked plan, completed steps, and pending checkpoints.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Project directory (defaults to current working directory)' },
      },
    },
  },
  {
    name: 'helen_next',
    description: 'Get instructions, requirements, and prompt guidance for the immediate next task in the project plan.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Project directory (defaults to current working directory)' },
      },
    },
  },
  {
    name: 'helen_done',
    description: 'Mark the current task as done and advance project state. Checkpoints require a recorded passing helen check.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Project directory (defaults to current working directory)' },
        note: { type: 'string', description: 'Optional summary of changes made or decisions taken' },
        force: { type: 'boolean', description: 'Force completion even if a checkpoint check did not pass' },
      },
    },
  },
  {
    name: 'helen_apply',
    description: 'Plan a HELEN goal, optionally track it or export a repository-aware agent brief.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'Goal or playbook name to apply (e.g. strategy, design, code, qa, release, security)' },
        cwd: { type: 'string', description: 'Project directory (defaults to current working directory)' },
        track: { type: 'boolean', description: 'Whether to track the generated plan in .helen/progress.json' },
        brief: { type: 'boolean', description: 'Include a concise repository-aware agent brief' },
        profile: { type: 'string', description: 'Explicit context depth: quick, standard, exhaustive; same acceptance gates' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'helen_doctor',
    description: 'Diagnose project health, missing githooks, misconfigured tools, and outdated skills.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Project directory (defaults to current working directory)' },
        fix: { type: 'boolean', description: 'Attempt automatic safe remediation of detected issues' },
      },
    },
  },
  {
    name: 'helen_prompt_get',
    description: 'Search or retrieve structured English prompt templates from the HELEN library.',
    inputSchema: {
      type: 'object',
      properties: {
        promptId: { type: 'string', description: 'Specific prompt ID to read (e.g. design/system, qa/smoke-test)' },
        search: { type: 'string', description: 'Keywords to search prompts across title, tags, and description' },
        limit: { type: 'number', description: 'Maximum search results to return (default 5)' },
        protocol: { type: 'boolean', description: 'Include shared execution rules (default true); omit only if already loaded' },
        cacheReady: { type: 'boolean', description: 'Put stable shared rules before task content; provider caching must be configured externally' },
      },
    },
  },
  {
    name: 'helen_skills_list',
    description: 'List available HELEN agent skills, trigger descriptions, and whether each is installed in the project.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Project directory to inspect installed skills' },
      },
    },
  },
  {
    name: 'helen_init_project',
    description: 'Bootstrap a production-ready HELEN project (setup + guardrails + architecture plan).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name or directory (defaults to current directory)' },
        goal: { type: 'string', description: 'Initial goal preset (strategy, design, code, full; default strategy)' },
        cwd: { type: 'string', description: 'Working directory' },
        dryRun: { type: 'boolean', description: 'Simulate without writing files' },
      },
    },
  },
];

export async function handleToolCall(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  return withStderrLogging(() => executeToolCall(name, args));
}

async function executeToolCall(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    const tool = HELEN_MCP_TOOLS.find(tool => tool.name === name);
    if (!isRecord(args)) throw new Error('Tool arguments must be an object');
    if (tool) {
      for (const key of tool.inputSchema.required ?? []) {
        if (!(key in args)) throw new Error(`Missing required argument: ${key}`);
      }
      for (const [key, value] of Object.entries(args)) {
        if (value === undefined) continue;
        const property = tool.inputSchema.properties[key];
        if (property && typeof value !== property.type) throw new Error(`Invalid argument ${key}: expected ${property.type}`);
      }
      if (args.limit !== undefined && (!Number.isInteger(args.limit) || (args.limit as number) < 0)) throw new Error('limit must be a non-negative integer');
    }
    const cwd = typeof args.cwd === 'string' && args.cwd ? args.cwd : process.cwd();
    switch (name) {
      case 'helen_resume': {
        return { content: [{ type: 'text', text: JSON.stringify(resumeProgress(cwd, args.decision as string | undefined), null, 2) }] };
      }
      case 'helen_status': {
        const progress = readProgress(cwd);
        if (!progress) {
          const detected = detectPhase(cwd);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    tracked: false,
                    detectedPhase: detected.phase,
                    confidence: detected.confidence,
                    evidence: detected.evidence,
                    message: 'No plan currently tracked. Use helen_apply with track: true to begin.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        const activeIdx = currentIndex(progress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  tracked: true,
                  goal: progress.goal,
                  title: progress.title,
                  phase: progress.phase,
                  currentStepIndex: activeIdx,
                  totalSteps: progress.steps.length,
                  formattedStatus: formatStatus(progress, cwd),
                  verification: !progress.lastCheck ? 'missing' : progress.lastCheck.fingerprint === repositoryFingerprint(cwd) ? 'current' : 'stale',
                  steps: progress.steps.map((s, idx) => ({
                    index: idx + 1,
                    kind: s.kind,
                    ref: s.ref,
                    why: s.why,
                    status: s.status,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'helen_next': {
        const progress = readProgress(cwd);
        if (!progress) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'No plan tracked in this project. Run helen_apply with track: true first.' }],
          };
        }
        const activeIdx = currentIndex(progress);
        if (activeIdx === -1) {
          return {
            content: [{ type: 'text', text: formatStatus(progress) }],
          };
        }
        const current = progress.steps[activeIdx]!;
        const formatted = formatNext(progress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  stepNumber: activeIdx + 1,
                  totalSteps: progress.steps.length,
                  kind: current.kind,
                  ref: current.ref,
                  why: current.why,
                  instructions: formatted,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'helen_done': {
        try {
          const updated = markDone(cwd, args.note as string | undefined, args.force === true);
          const nextIdx = currentIndex(updated);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    nextStepIndex: nextIdx,
                    isAllDone: nextIdx === -1,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (err: unknown) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to mark done: ${(err as Error).message}` }],
          };
        }
      }

      case 'helen_apply': {
        const goal = args.goal as string;
        const track = Boolean(args.track);
        const playbooks = readPlaybooks(undefined, cwd);

        const plan = buildPlan(cwd, goal, playbooks);
        const profile = workProfile(args.profile as string | undefined);
        if (track) {
          startProgress(cwd, plan, false, profile);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  goal: plan.goalId,
                  title: plan.goal.title,
                  stepsCount: plan.goal.steps.length,
                  tracked: track,
                  profile,
                  ...(args.brief ? { brief: formatBrief(plan, cwd, profile) } : {}),
                  missingSkills: plan.missingSkills,
                  steps: plan.goal.steps.map(s => ({
                    kind: s.kind,
                    ref: s.ref,
                    why: s.why,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'helen_doctor': {
        let autoFixReport: DoctorFixReport | null = null;
        if (args.fix) {
          const { repairDoctorIssues } = await import('./doctorFix.js');
          autoFixReport = repairDoctorIssues(cwd);
        }
        const results = [...runDoctor(cwd), ...runAgentDoctor(cwd)];
        const issues = results.filter(r => r.status !== 'ok');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalChecks: results.length,
                  passed: results.filter(r => r.status === 'ok').length,
                  issues: issues.map(i => ({
                    label: i.label,
                    status: i.status,
                    message: i.message,
                  })),
                  fixApplied: autoFixReport,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'helen_prompt_get': {
        if (args.promptId) {
          const content = readPrompt(args.promptId as string, undefined, { protocol: args.protocol !== false, cacheReady: args.cacheReady === true });
          if (!content) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Prompt "${args.promptId}" not found.` }],
            };
          }
          return {
            content: [{ type: 'text', text: content }],
          };
        }

        if (args.search) {
          const matches = searchPrompts(args.search as string).slice(0, (args.limit as number | undefined) ?? 5);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  matches.map(m => ({
                    id: m.id,
                    title: m.title,
                    phase: m.phase,
                    kind: m.kind,
                    summary: m.summary,
                  })),
                  null,
                  2
                ),
              },
            ],
          };
        }

        const entries = listPromptEntries().slice(0, (args.limit as number | undefined) ?? 10);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                entries.map(e => ({ id: e.id, title: e.title, phase: e.phase })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'helen_skills_list': {
        const skills = listSkills();
        const installed = new Set(installedHelenSkills(cwd).map(skill => skill.name));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                skills.map(s => {
                  const document = s.files?.['SKILL.md'] ?? (s.dir ? fs.readFileSync(path.join(s.dir, 'SKILL.md'), 'utf-8') : '');
                  const description = parseFrontmatter(document).data.description;
                  return {
                    name: s.name,
                    hasCustomFiles: Boolean(s.files),
                    description: typeof description === 'string' ? description : '',
                    installed: installed.has(s.name),
                  };
                }),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'helen_init_project': {
        const res = await runInitProject({
          cwd,
          name: args.name as string | undefined,
          goal: args.goal as string | undefined,
          dryRun: args.dryRun as boolean | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res, null, 2),
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: "${name}"` }],
        };
    }
  } catch (err: unknown) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error executing ${name}: ${(err as Error)?.message || String(err)}` }],
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Runs the MCP stdio server handling JSON-RPC 2.0 messages.
 */
export function startMcpServer(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout): void {
  const rl = readline.createInterface({
    input,
    terminal: false,
  });

  const sendResponse = (response: Record<string, unknown>) => {
    output.write(JSON.stringify(response) + '\n');
  };

  rl.on('line', async line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg: unknown;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
      return;
    }

    if (!isRecord(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' ||
        (msg.id !== undefined && msg.id !== null && typeof msg.id !== 'string' && typeof msg.id !== 'number')) {
      sendResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } });
      return;
    }
    const { id, method, params } = msg;

    // Notifications (no id)
    if (id === undefined) {
      if (method === 'notifications/initialized') {
        // Handshake complete
        return;
      }
      return;
    }

    switch (method) {
      case 'initialize': {
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'helen-mcp-server',
              version: '2.1.0',
            },
          },
        });
        break;
      }

      case 'ping': {
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {},
        });
        break;
      }

      case 'tools/list': {
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            tools: HELEN_MCP_TOOLS,
          },
        });
        break;
      }

      case 'tools/call': {
        if (!isRecord(params) || typeof params.name !== 'string' ||
            (params.arguments !== undefined && !isRecord(params.arguments))) {
          sendResponse({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid params' } });
          break;
        }
        const callResult = await handleToolCall(params.name, params.arguments as Record<string, unknown> | undefined);
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: callResult,
        });
        break;
      }

      default: {
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        });
        break;
      }
    }
  });
}
