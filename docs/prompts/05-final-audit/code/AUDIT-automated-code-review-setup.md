---
action: AUDIT
phase: 05-final-audit
summary: Decide whether and how to add automated code review (e.g. CodeRabbit or agent review) without leaking code or trusting it blindly.
modifies_code: false
---

# Automated Code Review Setup

## Goal

Decide whether automated code review is worth adding and how to do it without leaking code or depending on it blindly.

## Use when

- Before opening the repository to collaborators, or when pull requests are approved without real review.

## Requirements

1. Describe the review that exists today (human, CI, linters, agent) and its gaps.
2. For an external tool: what code leaves the repository, where it is processed, free-tier limits and heavy-use cost, retention policy (`helen skills external coderabbit`).
3. Installation: many tools offer `curl ... | sh`; download the script, read it and pin a version first. Prefer package managers with versions or official extensions.
4. Define which findings block (security, correctness) and which are optional, so automated review does not become noise.
5. Automated review complements, never replaces, human review and tests.

## Beyond the checklist

Use automated review before committing (on local changes) to catch hallucinations and code smells before the pull request.

## Limits

- Audit only. Never send a client's private repository to a service without the client's permission; never apply an automated finding without verifying it.

## Output

Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. End with a recommendation: adopt, adopt with limits, or skip.
