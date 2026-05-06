# GDPR Compliance (gdpr)

Cookie consent banner + Privacy/Cookie/Terms policies

## Category
Legal

## Description
Adds a React cookie consent banner, a consent context provider, and template legal policies (Privacy, Cookies, Terms of Service).

## Problem it Solves
Compliance with GDPR/RGPD is legally required for most sites but often forgotten or implemented poorly.

## Usage Information
- **Risk Level**: medium
- **Recommended Skill Level**: beginner

### When to Use
On any site collecting cookies or personal data.

### When NOT to Use
Purely internal tools with no tracking or data collection.

## Technical Details

### Files Created
- src/components/CookieBanner.tsx
- src/context/CookieContext.tsx
- src/pages/legal/PrivacyPolicy.tsx
- src/pages/legal/CookiePolicy.tsx
- src/pages/legal/Terms.tsx

### Files Modified
- src/App.tsx

### Dependencies
- **Runtime**: None
- **Dev**: None

### Requirements
- React 18+

## Risks & Warnings
- Legal templates are placeholders and must be reviewed by a lawyer.

## Post-Installation Steps
- Review and customize legal policies
- Wrap your app with <CookieProvider>
- Add <CookieBanner /> to your main layout
