# Security Utilities (security)

Env validation (zod) + sanitize utils + security headers reference

## Category
Security

## Description
Creates environment variable validation with Zod, HTML/text sanitization utilities, and a reference file for security headers.

## Problem it Solves
Missing env vars crash at runtime, unsanitized input leads to XSS, and security headers are often forgotten.

## Usage Information
- **Risk Level**: medium
- **Recommended Skill Level**: intermediate

### When to Use
On every project that handles user input or environment variables.

### When NOT to Use
If you already have env validation and sanitization in place.

## Technical Details

### Files Created
- src/lib/env.ts
- src/lib/sanitize.ts
- docs/security-headers.md

### Files Modified


### Dependencies
- **Runtime**: zod
- **Dev**: None

### Requirements
- TypeScript project

## Risks & Warnings
- env.ts will throw on missing required vars — intentional

## Post-Installation Steps
- Fill in your .env.local with real values
- Review security headers for your deploy target
