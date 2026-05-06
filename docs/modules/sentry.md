# Sentry Error Tracking (sentry)

@sentry/react setup + session replay + data redaction

## Category
Infrastructure

## Description
Integrates Sentry for real-time error tracking and session replays. Includes pre-configured privacy filters to redact sensitive user data from breadcrumbs and replays.

## Problem it Solves
Errors in production are invisible without tracking. Sentry makes debugging production issues possible by capturing state and user actions.

## Usage Information
- **Risk Level**: medium
- **Recommended Skill Level**: intermediate

### When to Use
Any production-ready application.

### When NOT to Use
Small experiments or projects with strict local-only data requirements.

## Technical Details

### Files Created
- src/lib/sentry.ts

### Files Modified
- src/main.tsx
- package.json
- .env.example

### Dependencies
- **Runtime**: @sentry/react
- **Dev**: None

### Requirements
- Sentry DSN

## Risks & Warnings
- Can impact performance slightly; requires careful sampling configuration.

## Post-Installation Steps
- Add your Sentry DSN to .env.local
- Import src/lib/sentry.ts in your main.tsx
