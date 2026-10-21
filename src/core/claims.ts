import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { appendEvent, cleanText } from "./events.js";
import { withLockSync } from "./fileLock.js";
import { isSafeProjectPath } from "./fs.js";

/**
 * Work claims: a lease an agent holds on one work item and on the paths it intends to edit.
 * Leases expire, so a crashed or stuck agent cannot block a plan forever, and every change is
 * made under a cross-process lock, so two agents cannot both win the same item.
 *
 * Claiming returns a secret token. Only its hash is stored, so whoever completes, extends or releases
 * a claim through MCP must present the token the claimant received; knowing an agent's name is not enough.
 */
export interface Claim {
  item: string;
  agent: string;
  role: string;
  /** sha256 of the claim token. The token itself is never written to disk. */
  tokenHash: string;
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
export const MAX_SCOPES = 64;
const ITEM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const AGENT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export class ClaimConflictError extends Error {
  constructor(
    message: string,
    readonly holder?: Claim,
  ) {
    super(message);
    this.name = "ClaimConflictError";
  }
}

export function claimsDir(cwd: string): string {
  return path.join(cwd, ".helen", "claims");
}

function lockFile(cwd: string): string {
  return path.join(cwd, ".helen", "claims.lock");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function validateItemId(item: string): string {
  if (!ITEM.test(item))
    throw new Error(
      `Invalid work item id "${item}": use letters, digits, dot, dash and underscore (max 100).`,
    );
  return item;
}

export function validateAgentName(agent: string): string {
  if (!AGENT.test(agent))
    throw new Error(
      `Invalid agent name "${agent}": use letters, digits, dot, dash, colon and underscore (max 64).`,
    );
  return agent;
}

/** Normalize a path scope: forward slashes, no "." or empty segments, never outside the project. */
export function normalizeScope(scope: string): string {
  const raw = scope.trim().replaceAll("\\", "/");
  if (!raw) throw new Error("Empty path scope");
  if (raw.length > 200)
    throw new Error("A path scope may be at most 200 characters.");
  if (raw.startsWith("/") || /^[A-Za-z]:/.test(raw) || raw.includes("\0"))
    throw new Error(
      `Path scope "${scope}" must be relative and stay inside the project.`,
    );
  const parts = raw.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.includes(".."))
    throw new Error(
      `Path scope "${scope}" must be relative and stay inside the project.`,
    );
  if (parts.length === 0) return "**";
  return raw.endsWith("/") ? `${parts.join("/")}/**` : parts.join("/");
}

function staticPrefix(scope: string): string[] {
  const parts = scope.split("/");
  const end = parts.findIndex((part) => /[*?[\]{}]/.test(part));
  return end === -1 ? parts : parts.slice(0, end);
}

/** Conservative: true unless the two scopes provably address different parts of the tree. */
export function scopesOverlap(a: string[], b: string[]): boolean {
  const left = a.map((scope) => staticPrefix(normalizeScope(scope)));
  const right = b.map((scope) => staticPrefix(normalizeScope(scope)));
  for (const l of left) {
    for (const r of right) {
      const common = Math.min(l.length, r.length);
      let same = true;
      for (let i = 0; i < common && same; i += 1) same = l[i] === r[i];
      if (same) return true;
    }
  }
  return false;
}

function claimFile(cwd: string, item: string): string {
  const file = path.join(claimsDir(cwd), `${validateItemId(item)}.json`);
  if (!isSafeProjectPath(cwd, file))
    throw new Error(
      "Claims must stay inside the project directory (no symbolic links in .helen).",
    );
  return file;
}

/** Hand-edited or damaged claim files are read defensively: an unparseable expiry counts as expired. */
function readClaimFile(file: string): Claim | null {
  try {
    const value = JSON.parse(
      fs.readFileSync(file, "utf8"),
    ) as Partial<Claim> & { token?: string };
    if (
      !value ||
      typeof value.item !== "string" ||
      typeof value.agent !== "string"
    )
      return null;
    const expires =
      typeof value.expiresAt === "string" &&
      Number.isFinite(Date.parse(value.expiresAt))
        ? value.expiresAt
        : new Date(0).toISOString();
    return {
      item: value.item,
      agent: value.agent,
      role: typeof value.role === "string" ? value.role : "implementer",
      tokenHash:
        typeof value.tokenHash === "string"
          ? value.tokenHash
          : typeof value.token === "string"
            ? hashToken(value.token)
            : "",
      claimedAt:
        typeof value.claimedAt === "string" ? value.claimedAt : expires,
      heartbeatAt:
        typeof value.heartbeatAt === "string" ? value.heartbeatAt : expires,
      expiresAt: expires,
      ttlSeconds:
        typeof value.ttlSeconds === "number"
          ? value.ttlSeconds
          : DEFAULT_TTL_SECONDS,
      paths: Array.isArray(value.paths)
        ? value.paths.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [],
      ...(typeof value.note === "string" ? { note: value.note } : {}),
    };
  } catch {
    return null;
  }
}

export function isExpired(claim: Claim, now: Date = new Date()): boolean {
  return Date.parse(claim.expiresAt) <= now.getTime();
}

function writeClaim(cwd: string, claim: Claim): void {
  const file = claimFile(cwd, claim.item);
  fs.mkdirSync(claimsDir(cwd), { recursive: true });
  if (!isSafeProjectPath(cwd, file))
    throw new Error(
      "Claims must stay inside the project directory (no symbolic links in .helen).",
    );
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(claim, null, 2)}\n`, {
    mode: 0o600,
  });
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
  if (!isSafeProjectPath(cwd, dir))
    throw new Error(
      "Claims must stay inside the project directory (no symbolic links in .helen).",
    );
  for (const name of fs
    .readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    const claim = readClaimFile(path.join(dir, name));
    if (!claim) continue;
    (isExpired(claim, now) ? listing.expired : listing.active).push(claim);
  }
  return listing;
}

export function readClaim(
  cwd: string,
  item: string,
  now: Date = new Date(),
): { claim: Claim; expired: boolean } | null {
  const claim = readClaimFile(claimFile(cwd, item));
  return claim ? { claim, expired: isExpired(claim, now) } : null;
}

/**
 * How a caller proves it is the claimant. The CLI is the operator's interface and may act by agent name;
 * MCP sessions are `strict`: they must present the token, so naming another agent is not enough.
 */
export interface ClaimProof {
  token?: string;
  strict?: boolean;
}

export interface ClaimRequest extends ClaimProof {
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
  /** The secret that proves ownership of this claim. Returned once; only its hash is stored. */
  token: string;
  /** Set when an expired lease held by another agent was taken over. */
  tookOverFrom?: Claim;
  /** True when the same agent claimed the item again and its lease was simply extended. */
  renewed: boolean;
}

function ttl(seconds: number | undefined): number {
  const value = seconds ?? DEFAULT_TTL_SECONDS;
  if (!Number.isFinite(value) || value < 30 || value > MAX_TTL_SECONDS)
    throw new Error(
      `Lease must be between 30 seconds and ${MAX_TTL_SECONDS / 3600} hours.`,
    );
  return Math.floor(value);
}

function cleanNote(note: string): string {
  return cleanText(note, 500).replace(/\s+/g, " ").trim();
}

/**
 * Throw unless the caller proves it holds `claim`: same agent and, when a token is presented (or required),
 * the token the claim was issued with. Claims written before tokens existed have no hash and are proven by name.
 */
function proveHolder(claim: Claim, agent: string, proof: ClaimProof): void {
  if (claim.agent !== agent)
    throw new ClaimConflictError(
      `"${claim.item}" is held by ${claim.agent}, not ${agent}.`,
      claim,
    );
  if (!claim.tokenHash) return;
  if (proof.token !== undefined) {
    if (hashToken(proof.token) !== claim.tokenHash)
      throw new ClaimConflictError(
        `The token does not match the claim on "${claim.item}".`,
        claim,
      );
    return;
  }
  if (proof.strict) {
    throw new ClaimConflictError(
      `"${claim.item}" is held by ${agent} in another session. Present the token from the claim, or use a unique agent name per session.`,
      claim,
    );
  }
}

export function claimItem(cwd: string, request: ClaimRequest): ClaimResult {
  const item = validateItemId(request.item);
  const agent = validateAgentName(request.agent);
  const seconds = ttl(request.ttlSeconds);
  if ((request.paths ?? []).length > MAX_SCOPES)
    throw new Error(
      `Declare at most ${MAX_SCOPES} path scopes; use a folder glob such as src/api/** instead of listing files.`,
    );
  const paths = [...new Set((request.paths ?? []).map(normalizeScope))];
  const now = request.now ?? new Date();

  return withLockSync(lockFile(cwd), () => {
    const existing = readClaim(cwd, item, now);
    let tookOverFrom: Claim | undefined;
    if (existing && !existing.expired && existing.claim.agent !== agent) {
      throw new ClaimConflictError(
        `"${item}" is claimed by ${existing.claim.agent} until ${existing.claim.expiresAt}.`,
        existing.claim,
      );
    }
    // Renewing a live lease is only for its holder: under MCP that means the token, not just the name.
    if (existing && !existing.expired)
      proveHolder(existing.claim, agent, request);
    if (existing?.expired && existing.claim.agent !== agent)
      tookOverFrom = existing.claim;

    if (paths.length > 0) {
      for (const other of listClaims(cwd, now).active) {
        if (
          other.item === item ||
          other.agent === agent ||
          other.paths.length === 0
        )
          continue;
        if (scopesOverlap(paths, other.paths)) {
          throw new ClaimConflictError(
            `Paths overlap with "${other.item}" held by ${other.agent}: ${other.paths.join(", ")}. Wait for it or choose disjoint paths.`,
            other,
          );
        }
      }
    }

    const renewed = Boolean(
      existing && !existing.expired && existing.claim.agent === agent,
    );
    // A holder that proved itself with its token keeps it; anyone else gets a fresh one, which invalidates the old.
    const keepToken =
      renewed &&
      request.token !== undefined &&
      existing!.claim.tokenHash === hashToken(request.token);
    const token = keepToken
      ? request.token!
      : crypto.randomBytes(24).toString("base64url");
    const claim: Claim = {
      item,
      agent,
      role: request.role ?? existing?.claim.role ?? "implementer",
      tokenHash: hashToken(token),
      claimedAt: renewed ? existing!.claim.claimedAt : now.toISOString(),
      heartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + seconds * 1000).toISOString(),
      ttlSeconds: seconds,
      paths: paths.length > 0 || !renewed ? paths : existing!.claim.paths,
      ...(request.note
        ? { note: cleanNote(request.note) }
        : renewed && existing!.claim.note
          ? { note: existing!.claim.note }
          : {}),
    };
    const previous = existing
      ? fs.readFileSync(claimFile(cwd, item), "utf8")
      : null;
    writeClaim(cwd, claim);
    try {
      if (tookOverFrom)
        appendEvent(cwd, {
          type: "claim.expired",
          agent: tookOverFrom.agent,
          item,
          data: { expiredAt: tookOverFrom.expiresAt, takenBy: agent },
        });
      appendEvent(cwd, {
        type: renewed ? "claim.renewed" : "claim.created",
        agent,
        item,
        data: { role: claim.role, paths, expiresAt: claim.expiresAt },
      });
    } catch (error) {
      // A claim nobody can see in the log must not block others: undo it.
      if (previous === null) fs.rmSync(claimFile(cwd, item), { force: true });
      else fs.writeFileSync(claimFile(cwd, item), previous, { mode: 0o600 });
      throw error;
    }
    return { claim, token, renewed, ...(tookOverFrom ? { tookOverFrom } : {}) };
  });
}

export interface HeartbeatOptions extends ClaimProof {
  ttlSeconds?: number;
  now?: Date;
}

/** Extend a lease. Only the holder can; an expired lease must be claimed again. */
export function heartbeatClaim(
  cwd: string,
  item: string,
  agent: string,
  options: HeartbeatOptions = {},
): Claim {
  validateAgentName(agent);
  const now = options.now ?? new Date();
  return withLockSync(lockFile(cwd), () => {
    const existing = readClaim(cwd, item, now);
    if (!existing) throw new Error(`"${item}" has no claim.`);
    proveHolder(existing.claim, agent, options);
    if (existing.expired)
      throw new ClaimConflictError(
        `The lease on "${item}" expired at ${existing.claim.expiresAt}; claim it again.`,
        existing.claim,
      );
    const seconds = ttl(options.ttlSeconds ?? existing.claim.ttlSeconds);
    const claim: Claim = {
      ...existing.claim,
      heartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + seconds * 1000).toISOString(),
      ttlSeconds: seconds,
    };
    writeClaim(cwd, claim);
    return claim;
  });
}

export interface ReleaseOptions extends ClaimProof {
  reason?: string;
  /** Release a claim held by someone else (a person or an orchestrator cleaning up). Never combined with a token. */
  force?: boolean;
  /** Return null instead of throwing when the claim is no longer ours (it expired and someone else took it). */
  ifOwned?: boolean;
  /** Event type recorded. */
  event?: string;
  now?: Date;
}

export function releaseClaim(
  cwd: string,
  item: string,
  agent: string,
  options: ReleaseOptions = {},
): Claim | null {
  validateAgentName(agent);
  return withLockSync(lockFile(cwd), () => {
    const existing = readClaim(cwd, item, options.now);
    if (!existing) return null;
    // An expired lease protects nothing, so anyone may clear it; a live one needs its holder or an explicit force.
    if (!existing.expired && !options.force) {
      try {
        proveHolder(existing.claim, agent, options);
      } catch (error) {
        if (options.ifOwned) return null;
        throw error;
      }
    } else if (
      options.ifOwned &&
      (existing.claim.agent !== agent ||
        (options.token !== undefined &&
          existing.claim.tokenHash !== hashToken(options.token)))
    ) {
      return null; // never clear someone else's claim while cleaning up our own
    }
    fs.rmSync(claimFile(cwd, item), { force: true });
    appendEvent(cwd, {
      type: options.event ?? "claim.released",
      agent,
      item,
      data: {
        holder: existing.claim.agent,
        ...(options.reason ? { reason: cleanNote(options.reason) } : {}),
      },
    });
    return existing.claim;
  });
}

/** Whether `agent` currently holds a live lease on `item`, proven as `proof` says. */
export function holdsClaim(
  cwd: string,
  item: string,
  agent: string,
  options: ClaimProof & { now?: Date } = {},
): boolean {
  const existing = readClaim(cwd, item, options.now);
  if (!existing || existing.expired) return false;
  try {
    proveHolder(existing.claim, agent, options);
    return true;
  } catch {
    return false;
  }
}
