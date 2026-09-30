# GitHub Copilot Instructions for HELEN

1. **Architecture & Standards**: Follow modular TypeScript patterns with strict types and zero unchecked `any`.
2. **Security**: Do not commit secrets, environment keys, or tokens.
3. **Testing**: Add unit tests for new features and verify `npm test` passes before pushing.
4. **HELEN Commands**:
   - `helen apply <goal>` to inspect project lifecycle steps.
   - `helen check` to run verification gates.
