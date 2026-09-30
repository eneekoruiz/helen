---
action: ENHANCE
phase: 04-before-production
summary: Audit privacy and legal risk, then fix what is needed to publish: privacy and cookie policies, consent banner, script blocking, forms.
modifies_code: true
aliases:
  - audit-privacy-legal-and-compliance
  - enhance-privacy-cookie-legal-publication-readiness
---

# Privacy and Legal Readiness

## Goal

Give the site an honest, prudent legal and privacy posture before it goes live: know what data is processed, then fix policies, consent and forms so the site does what its texts say. This does not replace professional legal advice, but it removes obvious risks.

## Use when

- Before publishing to production or delivering to a client; when legal pages, a cookie banner, consent or a third-party inventory are missing.

## Requirements

Inputs: main jurisdiction, business type, data collected, third parties used, stack and routes, legal contact. Ask for missing ones; never invent them.

1. **Audit first:** personal and sensitive data, analytics, logs, uploads, support data, third-party processors; consent, cookies, tracking, retention, deletion, export, data minimization; licenses and attribution; claims that create legal or trust exposure. If the user asked only for an audit, stop here and report.
2. **Privacy policy** reachable from the footer: controller, data collected, purposes, legal basis, retention, recipients and processors, international transfers, user rights, privacy contact, last update date.
3. **Cookie policy** when cookies or tracking exist: what they are, which are used, categories (necessary, analytics, marketing, preferences), how to accept, reject or change, third parties, duration.
4. **Legal notice / terms / disclaimers** when the business requires them.
5. **Consent:** banner and preference center with accept, reject and configure at the same level; analytics, pixels, marketing and non-essential embeds blocked until valid consent; preferences stored and changeable later.
6. **Inventory** of cookies and third parties: name, purpose, provider, duration, category.
7. **Forms:** privacy information, consent where required, link to the policy.
8. Legal pages findable from footer and navigation; remove absolute claims like "100% GDPR compliant" without backing.

## Beyond the checklist

No legal theater: if the site uses no non-essential cookies, say so plainly. Describe what really happens with third-party tools.

## Limits

- Never invent the owner's name, address, tax ID, emails, processors or jurisdiction: use clearly marked placeholders.
- No definitive legal advice: flag human legal review for regulated sales, health, finance, minors, sensitive data or advanced tracking.
- No tracking on by default; no hidden reject button or dark patterns.

## Checks

- Footer links to privacy, cookie (if applicable) and legal pages.
- Banner offers accept, reject and configure; non-essential scripts wait for consent.
- Forms link the policy; critical legal placeholders are marked; build and tests pass.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```

Also include the data and processor inventory, scripts now blocked until consent, and placeholders that need the client's real data. Verdict: `LOW RISK`, `NEEDS PRIVACY FIXES` or `DO NOT RELEASE`.
