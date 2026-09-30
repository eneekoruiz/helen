# GitHub Copilot Instructions for HELEN

1. **Architecture & Standards**: Follow modular TypeScript patterns with strict types and zero unchecked `any`.
2. **Security**: Do not commit secrets, environment keys, or tokens.
3. **Testing**: Add unit tests for new features and verify `npm test` passes before pushing.
4. **HELEN Commands**:
   - `helen apply <goal>` to inspect project lifecycle steps.
   - `helen check` to run verification gates.
5. **Level 100 Mindset**: User requests represent the Level 0 baseline. Exercise full technical mastery to proactively surface and fix adjacent bugs, unhandled errors, and architectural debt during implementation.

