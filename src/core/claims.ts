import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendEvent } from './events.js';
import { withLockSync } from './fileLock.js';
import { isSafeProjectPath } from './fs.js';

/**
 * Work claims: a lease an agent holds on one work item and on the paths it intends to edit.
 * Leases expire, so a crashed or stuck agent cannot block a plan forever, and every change is
 * made under a cross-process lock, so two agents cannot both win the same item.
 */
export interface Claim {
  item: string;
  agent: string;
  role: string;
  token: string;
  claimedAt: string;
  heartbeatAt: string;
  expiresAt: string;
  ttlSeconds: number;
  /** Paths or globs the agent will write. Empty means read-only. */
  paths: string[];
  note?: string;
}

export const DEFAULT_TTL_SECONDS = 30 * 60;
export const MAX_TTL_SECONDS = 4 * 60 * 60;
const ITEM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const AGENT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export class ClaimConflictError extends Error {
  constructor(message: string, readonly holder?: Claim) {
    super(message);
    this.name = 'ClaimConflictError';
  }
}

export function claimsDir(cwd: string): string {
  return path.join(cwd, '.helen', 'claims');
}

function lockFile(cwd: string): string {
  return path.join(cwd, '.helen', 'claims.lock');
}

export function validateItemId(item: string): string {
  if (!ITEM.test(item)) throw new Error(`Invalid work item id "${item}": use letters, digits, dot, dash and underscore (max 100).`);
  return item;
}

export function validateAgentName(agent: string): string {
  if (!AGENT.test(agent)) throw new Error(`Invalid agent name "${agent}": use letters, digits, dot, dash, colon and underscore (max 64).`);
  return agent;
}

/** Normalize a path scope to forward slashes; scopes must stay inside the project. */
export function normalizeScope(scope: string): string {
  let value = scope.trim().replaceAll('\\', '/').replace(/^\.\//, '');
  if (!value) throw new Error('Empty path scope');
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.split('/').includes('..')) {
    throw new Error(`Path scope "${scope}" must be relative and stay inside the project.`);
  }
  if (value.endsWith('/')) value = `${value}**`;
  return value;
}

function staticPrefix(scope: string): string[] {
  const parts = scope.split('/');
  const end = parts.findIndex(part => /[*?[\]{}]/.test(part));
  return end === -1 ? parts : parts.slice(0, end);
}

/** Conservative: true unless the two scopes provably address different parts of the tree. */
export function scopesOverlap(a: string[], b: string[]): boolean {
  for (const left of a) {
    for (const right of b) {
      const l = staticPrefix(normalizeScope(left));
      const r = staticPrefix(normalizeScope(right));
      const common = Math.min(l.length, r.length);
      if (l.slice(0, common).join('/') === r.slice(0, common).join('/')) return true;
    }
  }
  return false;
}

function claimFile(cwd: string, item: string): string {
  return path.join(claimsDir(cwd), `${validateItemId(item)}.json`);
}

function readClaimFile(file: string): Claim | null {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8')) as Claim;
    return value && typeof value.item === 'string' && typeof value.agent === 'string' && typeof value.expiresAt === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function isExpired(claim: Claim, now: Date = new Date()): boolean {
  return Date.parse(claim.expiresAt) <= now.getTime();
}

function writeClaim(cwd: string, claim: Claim): void {
  const file = claimFile(cwd, claim.item);
  if (!isSafeProjectPath(cwd, file)) throw new Error('Claims must stay inside the project directory');
  fs.mkdirSync(claimsDir(cwd), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(claim, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

export interface ClaimListing {
  active: Claim[];
  expired: Claim[];
}

export function listClaims(cwd: string, now: Date = new Date()): ClaimListing {
  const dir = claimsDir(cwd);
  const listing: ClaimListing = { active: [], expired: [] };
  if (!fs.existsSync(dir)) return listing;
  for (const name of fs.readdirSync(dir).filter(entry => entry.endsWith('.json')).sort()) {
    const claim = readClaimFile(path.join(dir, name));
    if (!claim) continue;
    (isExpired(claim, now) ? listing.expired : listing.active).push(claim);
  }
  return listing;
}

export function readClaim(cwd: string, item: string, now: Date = new Date()): { claim: Claim; expired: boolean } | null {
  const claim = readClaimFile(claimFile(cwd, item));
  return claim ? { claim, expired: isExpired(claim, now) } : null;
}

export interface ClaimRequest {
  item: string;
  agent: string;
  role?: string;
  paths?: string[];
  ttlSeconds?: number;
  note?: string;
  now?: Date;
}

export interface ClaimResult {
  claim: Claim;
  /** Set when an expired lease held by another agent was taken over. */
  tookOverFrom?: Claim;
  /** True when the same agent claimed the item again and its lease was simply extended. */
  renewed: boolean;
}

function ttl(seconds: number | undefined): number {
  const value = seconds ?? DEFAULT_TTL_SECONDS;
  if (!Number.isFinite(value) || value < 30 || value > MAX_TTL_SECONDS) throw new Error(`Lease must be between 30 seconds and ${MAX_TTL_SECONDS / 3600} hours.`);
  return Math.floor(value);
}

export function claimItem(cwd: string, request: ClaimRequest): ClaimResult {
  const item = validateItemId(request.item);
  const agent = validateAgentName(request.agent);
  const seconds = ttl(request.ttlSeconds);
  const paths = [...new Set((request.paths ?? []).map(normalizeScope))];
  const now = request.now ?? new Date();

  return withLockSync(lockFile(cwd), () => {
    const existing = readClaim(cwd, item, now);
    let tookOverFrom: Claim | undefined;
    if (existing && !existing.expired && existing.claim.agent !== agent) {
      throw new ClaimConflictError(`"${item}" is claimed by ${existing.claim.agent} until ${existing.claim.expiresAt}.`, existing.claim);
    }
    if (existing?.expired && existing.claim.agent !== agent) tookOverFrom = existing.claim;

    if (paths.length > 0) {
      for (const other of listClaims(cwd, now).active) {
        if (other.item === item || other.agent === agent || other.paths.length === 0) continue;
        if (scopesOverlap(paths, other.paths)) {
          throw new ClaimConflictError(`Paths overlap with "${other.item}" held by ${other.agent}: ${other.paths.join(', ')}. Wait for it or choose disjoint paths.`, other);
        }
      }
    }

    const renewed = Boolean(existing && !existing.expired && existing.claim.agent === agent);
    const claim: Claim = {
      item,
      agent,
      role: request.role ?? existing?.claim.role ?? 'implementer',
      token: renewed ? existing!.claim.token : crypto.randomUUID(),
      claimedAt: renewed ? existing!.claim.claimedAt : now.toISOString(),
      heartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + seconds * 1000).toISOString(),
      ttlSeconds: seconds,
      paths: paths.length > 0 || !renewed ? paths : existing!.claim.paths,
      ...(request.note ? { note: request.note.slice(0, 500) } : renewed && existing!.claim.note ? { note: existing!.claim.note } : {}),
    };
    writeClaim(cwd, claim);
    if (tookOverFrom) appendEvent(cwd, { type: 'claim.expired', agent: tookOverFrom.agent, item, data: { expiredAt: tookOverFrom.expiresAt, takenBy: agent } });
    appendEvent(cwd, { type: renewed ? 'claim.renewed' : 'claim.created', agent, item, data: { role: claim.role, paths, expiresAt: claim.expiresAt } });
    return { claim, renewed, ...(tookOverFrom ? { tookOverFrom } : {}) };
  });
}

/** Extend a lease. Only the holder can; an expired lease must be claimed again. */
export function heartbeatClaim(cwd: string, item: string, agent: string, ttlSeconds?: number, now: Date = new Date()): Claim {
  validateAgentName(agent);
  return withLockSync(lockFile(cwd), () => {
    const existing = readClaim(cwd, item, now);
    if (!existing) throw new Error(`"${item}" has no claim.`);
    if (existing.claim.agent !== agent) throw new ClaimConflictError(`"${item}" is held by ${existing.claim.agent}, not ${agent}.`, existing.claim);
    if (existing.expired) throw new ClaimConflictError(`The lease on "${item}" expired at ${existing.claim.expiresAt}; claim it again.`, existing.claim);
    const seconds = ttl(ttlSeconds ?? existing.claim.ttlSeconds);
    const claim: Claim = { ...existing.claim, heartbeatAt: now.toISOString(), expiresAt: new Date(now.getTime() + seconds * 1000).toISOString(), ttlSeconds: seconds };
    writeClaim(cwd, claim);
    return claim;
  });
}

export interface ReleaseOptions {
  reason?: string;
  /** Release a claim held by someone else (a person or an orchestrator cleaning up). */
  force?: boolean;
  /** Event type recorded. */
  event?: string;
  now?: Date;
}

export function releaseClaim(cwd: string, item: string, agent: string, options: ReleaseOptions = {}): Claim | null {
  validateAgentName(agent);
  return withLockSync(lockFile(cwd), () => {
    const existing = readClaim(cwd, item, options.now);
    if (!existing) return null;
    if (existing.claim.agent !== agent && !existing.expired && !options.force) {
      throw new ClaimConflictError(`"${item}" is held by ${existing.claim.agent}; only the holder (or --force) can release it.`, existing.claim);
    }
    fs.rmSync(claimFile(cwd, item), { force: true });
    appendEvent(cwd, { type: options.event ?? 'claim.released', agent, item, data: { holder: existing.claim.agent, ...(options.reason ? { reason: options.reason } : {}) } });
    return existing.claim;
  });
}

/** Whether `agent` currently holds a live lease on `item`. */
export function holdsClaim(cwd: string, item: string, agent: string, now: Date = new Date()): boolean {
  const existing = readClaim(cwd, item, now);
  return Boolean(existing && !existing.expired && existing.claim.agent === agent);
}
