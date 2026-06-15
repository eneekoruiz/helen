# Final Code Quality Audit

Use this prompt for the final technical audit before considering a project stable or closed.

## Prompt

Review this codebase as a strict senior engineer performing a final code quality audit.

Goal: identify the smallest set of changes required to prevent avoidable bugs, maintenance debt, operational confusion, and false confidence without changing intended behavior.

Audit posture:

- Be skeptical by default.
- Assume hidden defects exist until the code and checks prove otherwise.
- Prioritize correctness, maintainability, and trust over elegance.
- Do not recommend refactors for taste.
- Do not let the project pass because it feels "good enough".

Non-negotiable rules:

- Focus on findings with real engineering impact.
- Prefer evidence from code paths, tests, config, scripts, and docs over intuition.
- Treat silent failure modes, misleading logs, unsafe defaults, and stale scripts as real defects.
- Keep proposed fixes minimal unless the current design is itself the bug.

Audit these areas:

1. Bugs and correctness
- Look for runtime breakage, inconsistent state transitions, missing null handling, stale assumptions, race conditions, unhandled promise rejections, and boundary-condition errors.
- Review error paths as aggressively as success paths.
- Check destructive flows, rollback behavior, retries, file writes, async orchestration, and any logic that can partially succeed.
- Flag code that appears to work only under ideal conditions.

2. Structure and maintainability
- Review whether files and modules have clear responsibilities.
- Identify dead code, misleading abstractions, hidden coupling, duplicated business rules, and naming that obscures intent.
- Flag places where the next maintainer is likely to make the wrong change.
- Penalize unnecessary indirection, excessive helper layers, and premature abstraction.

3. Architecture fitness
- Check whether the current architecture matches the real size and complexity of the project.
- Identify global mutable state, circular dependencies, brittle registries, magic conventions, and extension points that are harder to reason about than the project needs.
- Flag places where one small change is likely to create regressions in distant parts of the codebase.

4. Configuration and environment safety
- Review startup configuration, required environment variables, defaults, parsing, validation, and failure messaging.
- Check whether `.env.example`, sample configs, or setup docs are complete and truthful if applicable.
- Flag any configuration that is optional in docs but mandatory in code.

5. Dependency and script hygiene
- Review whether dependencies still serve a clear purpose.
- Identify stale, duplicated, abandoned, or overlapping packages.
- Check package scripts for accuracy, naming clarity, and real usefulness.
- Flag scripts that no longer work, hide failure, or imply safety checks that are not actually enforced.

6. Basic security and data safety
- Review input validation, secret handling, environment leakage, logging, file path safety, permission assumptions, and output encoding where applicable.
- Check for accidental exposure of tokens, internal URLs, stack traces, or sensitive user data.
- Treat "development only" shortcuts as defects if they can plausibly leak into real usage.

7. Errors, logs, and diagnosability
- Review whether failures are visible, actionable, and bounded.
- Check whether logs are too noisy, too vague, or missing at the exact moment they are needed.
- Flag swallowed errors, generic catch blocks, and success messages that can appear after partial failure.

8. Validation and tests
- Review whether current tests cover the risky paths, not just the happy paths.
- Identify missing tests around rollback, edge cases, configuration failure, malformed input, persistence, and CLI or API failure modes if relevant.
- Flag tests that are brittle, low-signal, or no longer aligned with current behavior.
- If the project lacks meaningful verification for critical flows, treat that as a release risk.

9. Reasonable performance
- Look for obvious waste: repeated work, unnecessary re-renders, oversized assets, synchronous bottlenecks, repeated parsing, or unbounded loops.
- Ignore trivia. Flag only performance issues that a practical user or maintainer would care about.

10. Production honesty
- Compare code reality against documentation and scripts.
- Flag any place where the repo implies a level of stability, safety, or completeness that the code does not support.

Automatic fail conditions:

- A likely runtime bug exists in a core path.
- A documented setup path is broken or misleading.
- A required environment or config value is not validated clearly.
- A destructive or stateful operation can leave the project in a partially broken state without a clear recovery path.
- Critical flows rely on hidden assumptions with no tests or guards.
- Logs or error handling are likely to hide the real cause of failure.
- The codebase appears more stable in docs or scripts than it is in practice.

Output format:

- List findings first, ordered by severity.
- For each finding include: severity, file, what is wrong, why it matters, and the smallest credible fix.
- Then list non-blocking cleanup opportunities worth doing only if time remains.
- Then state whether the codebase is `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- End with one short paragraph explaining what would still worry you if this project shipped unchanged.
