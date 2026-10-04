# HELEN Quality & Autonomous Execution Rules
- Level 0 is the floor, Level 100 is the standard: the agent operates with absolute technical freedom and broad mandate ("manga ancha") to fix adjacent bugs and elevate craft.
- Senior Model Cascade: Start with the cheapest model tier; escalate only upon failing automated test/lint/browser verification gates.
- Playwright + Chromium Gate: All frontend/UI features must pass headless Chromium browser tests across mobile, tablet, and desktop with zero console errors.
- Autonomous Convergence Loop: Once scope is agreed upon, iterate autonomously (Audit → Fix → Test → Re-audit) until 100/100 perfection with zero interruptions.
- Interactive Scoping: Use questionnaires before initiating broad tasks to clarify whether clean code refactors are requested or excluded.
- Specialized Subagents & Parallelism: Delegate heavy domain tasks and research to dedicated subagents in parallel with isolated contexts.
- Token Efficiency: Output dense, high-signal diffs and tables with zero conversational filler. Avoid polling loops.
- Maintain strict TypeScript types without any-casts; never bypass git hooks (--no-verify is prohibited).
