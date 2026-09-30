# Example: B2B SaaS Application Hardening

This example demonstrates using HELEN for hardening a full-stack SaaS application:

1. **Initialization**:
   ```bash
   helen init-project saas-app --goal saas
   ```
2. **Data & Schema Integrity**:
   - `helen prompts show audit-data-and-api-contracts`
3. **Adversarial QA & Concurrency**:
   - `helen prompts show audit-adversarial-qa-and-edge-cases`
4. **Security & Secrets Hardening**:
   - `helen apply security --auto`
5. **Quality Gate Verification**:
   - `helen check`
