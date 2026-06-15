# Final Code Quality Audit

Use this prompt for the last technical audit before considering a project stable.

## Prompt

Review this codebase as a senior engineer performing a final code quality audit.

Goal: identify the smallest set of changes that improves confidence, maintainability, and correctness without altering intended behavior.

Rules:

- Focus on real risks, not style preferences.
- Avoid speculative rewrites.
- Keep fixes minimal and compatible with current functionality.
- Prefer evidence from the codebase over assumptions.

Audit these areas:

1. Bugs and correctness
- Find likely runtime bugs, broken flows, unsafe assumptions, and edge cases.
- Check error paths, null handling, async flows, state transitions, and file or network boundaries if present.

2. Structure and maintainability
- Review folder structure, naming, file responsibilities, and module boundaries.
- Flag avoidable complexity, dead code, and unclear ownership.
- Detect copy-paste duplication that should be consolidated.

3. Architecture
- Check whether the current architecture still fits the project size.
- Flag tight coupling, hidden global state, circular dependencies, or abstractions that add cost without value.

4. Basic security and data safety
- Review secrets handling, environment variable usage, input validation, output encoding, logging of sensitive data, and dangerous defaults.
- Call out obvious misuse of tokens, credentials, or permissive configuration.

5. Dependencies and scripts
- Review dependency relevance, abandoned packages, duplicated tooling, and scripts that no longer match the project.
- Check whether package scripts are clear, useful, and consistent.

6. Errors, logs, and operational clarity
- Review error messages, fallback behavior, console noise, and log usefulness.
- Make sure failures are diagnosable without exposing sensitive information.

7. Validation and configuration
- Check required environment variables, config defaults, schema validation, and startup safety.
- Confirm `.env.example` or equivalent config guidance is aligned with reality if the project uses environment variables.

8. Reasonable performance
- Look for obvious waste such as repeated work, unnecessary re-renders, oversized assets, or blocking operations in hot paths.
- Ignore micro-optimizations unless they clearly matter.

Output format:

- List findings first, ordered by severity.
- For each finding, include the file and the practical impact.
- Then list low-risk cleanup opportunities.
- End with a brief statement on whether the project is ready to leave as-is or needs a final fix pass.
