---
action: INIT
phase: 01-start-project
summary: Rapidly understand, map, and document an existing codebase architecture in 10 minutes.
modifies_code: false
aliases:
  - repo-10min
  - repo-overview
---

# Codebase Rapid Orientation in 10 Minutes

## Goal

Provide a new developer or incoming AI coding agent with a high-clarity 10-minute briefing on repository architecture, conventions, and runtime flow.

## Use when

- You join an existing codebase or work in a repository for the first time.
- An AI coding session begins and needs to orient itself without scanning thousands of lines.

## Steps

1. **Detect Tooling & Language**: Inspect `package.json`, tool configs, and package manager.
2. **Locate Architectural Core**: Identify entry points (`src/index.ts`, `app/`, `routes/`, or `main.go`).
3. **Map State & Data Flow**: Trace how user input flows from UI/API to data persistence.
4. **Identify Verification Gates**: Find the commands for type checking, linting, and testing.
5. **Note Known Traps**: Identify legacy patterns, flaky fixtures, or uncommitted files.

## Limits

- Do not refactor or modify code during orientation.
- Do not spend tokens reading generated files, lockfiles, or test snapshots.

## Output

A concise structured summary:
- **Core Purpose & Stack**
- **Entry Points & Key Modules**
- **How to Run & Verify**
- **Risks & Gotchas**
