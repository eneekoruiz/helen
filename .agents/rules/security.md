<!-- HELEN:START (managed by helen setup, edit outside this block) -->
# HELEN Security Rules
- Never commit or print real secrets, tokens, private keys or passwords.
- Always use environment variables (.env.local) and sanitized inputs.
- Enforce strict CSP headers and validate external inputs.
- Validate all user input at system boundaries using schema-based validation.
- SQL injection prevention (parameterized queries) and XSS prevention (sanitized output).
- Error messages must not leak sensitive stack traces or environment variables.
<!-- HELEN:END -->
