---
action: GENERATE
phase: 06-release
summary: Write the changelog, release notes, migration notes, demo script and announcement copy that match what actually ships.
modifies_code: true
---

# Release Notes, Changelog and Demo Package

## Goal

Make releases understandable, credible and reusable: notes, changelog and demo material that match what actually ships.

## Use when

- Preparing a release, a launch or a client demo.

## Requirements

1. Review or generate the changelog, release notes, migration notes, README updates, demo script, screenshot guidance and social preview text.
2. Explain user value, breaking changes, known issues and verification commands.
3. Flag missing screenshots or demo steps.
4. Remove inflated claims and vague release language.
5. Every artifact matches the shipped state (check against git history and the code).

## Beyond the checklist

Reusable launch assets: short and long demo, screenshot set, social card, FAQ, post-release follow-up checklist.

## Limits

- Never announce features that are partial or absent; mark anything unverified.

## Output

1. Communication gaps in current documents.
2. Changelog (Markdown, grouped by type).
3. Demo script with exact steps.
4. Announcement copy and the recommended release narrative.
