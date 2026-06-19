# Privacy, Legal, and Compliance Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Detect privacy, legal, consent, retention, compliance, and trust risks before public release or client delivery.

## Prompt

Act as a privacy-minded Staff Engineer, Security Engineer, SaaS founder, product counsel partner, and compliance reviewer.

Review this repository for privacy, legal, and compliance risks.

## Requisitos mínimos obligatorios

1. Identify personal data, sensitive data, analytics data, logs, uploads, support data, and third-party processors.
2. Review consent, cookie behavior, tracking, retention, deletion, export, access, and data minimization.
3. Check privacy policy, terms, legal copy, disclaimers, licenses, attribution, and open-source obligations if present.
4. Identify compliance expectations relevant to the project type: GDPR, accessibility expectations, security claims, data residency, audit trails, or industry constraints.
5. Flag claims that create legal or trust exposure.

## Más allá de estos criterios

Look for subtle trust risks: analytics added without consent, logs that retain user data, screenshots with private data, unclear ownership of generated content, missing deletion semantics, misleading privacy copy, or third-party lock-in that affects user rights.

Do not create fake compliance theater. Recommend the smallest honest legal/privacy posture that matches the project maturity.

## Formato de entrega

1. Data and processor inventory.
2. Privacy blockers and legal/compliance risks (classified by severity: Críticos, Importantes, Opcionales).
3. Trust improvements.
4. Minimal remediation plan.
5. Verdict: `LOW RISK`, `NEEDS PRIVACY FIXES`, or `DO NOT RELEASE`.
