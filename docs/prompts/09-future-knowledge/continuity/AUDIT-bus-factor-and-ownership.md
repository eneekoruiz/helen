---
action: AUDIT
phase: 09-future-knowledge
summary: Find knowledge and access that depend on one person: accounts, payment methods, renewals, deploy steps, single-author modules.
modifies_code: false
aliases:
  - audit-bus-factor
  - audit-long-term-ownership-review
---

# Bus Factor and Ownership Audit

## Goal

Make sure the project survives the sudden absence of any one person, and that nothing critical expires, gets suspended or stays locked in someone's personal account.

## Use when

- Before handoff, when a team member leaves, and yearly.

## Requirements

1. **Accounts and ownership:** who legally and technically owns domains, hosting, databases, repositories, stores (Apple, Google Play), payment (Stripe) and integrated SaaS; admin emails belong to the organization, not personal accounts.
2. **Renewals:** domains, certificates, hosting and critical SaaS subscriptions with renewal dates; anything expiring in the next 90 days is high priority.
3. **Payment methods:** not tied to an individual developer's card; shared methods with alerts.
4. **Deploy knowledge:** does production deploy need manual steps or passwords that live on one machine?
5. **Critical modules:** complex areas touched by a single developer without tests or comments.
6. **Secrets:** production credentials not tied to a personal email; a team password manager in place; periodic rotation of master credentials.
7. SLAs and support guarantees of critical providers, and the effect of price changes.

## Beyond the checklist

Shared institutional accounts (e.g. `devops@company.com`), a team password manager, pairing on grey areas of business logic.

## Limits

- Audit only. Never list raw passwords, card numbers or private keys: say where they are stored. No private personal data in public docs.

## Output

1. Bus factor level (1 = critical, 3+ = safe) and an ownership and renewals table (provider, service, expiry, owner).
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Knowledge monopolies and concrete remediation steps.
