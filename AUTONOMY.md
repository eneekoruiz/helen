# HELEN Safe Autonomous Execution Guide

This document establishes the boundaries of autonomous agent actions when running with HELEN.

## 1. Allowed Autonomous Actions (Zero Approval Required)
- Reading project files, configs, documentation, and AST.
- Executing read-only checks: `helen check`, `npm run typecheck`, `npm run lint`, `npm test`.
- Formatting code and organizing imports.
- Running `helen token-budget`, `helen report`, `helen doctor`.
- Generating or updating `.helen/STATE.md`.

## 2. Actions Requiring Explicit Human Approval
- Installing new third-party dependencies (`npm install <pkg>`).
- Adding or modifying third-party MCP servers with external network credentials.
- Modifying production secrets, `.env` templates, or deployment configurations.
- Destructive git commands (`git reset --hard`, `git push --force`).
- Running database migrations or destructive operations on live services.

## 3. Autonomous Feedback Loop
Whenever an agent executes a plan via `helen apply <goal> --auto` or `helen next` / `helen done`:
1. Run local checks.
2. Stop immediately if any checkpoint fails.
3. Report what was accomplished, what was skipped, and the remaining risk profile.
