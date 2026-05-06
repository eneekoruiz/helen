# Progressive Web App (pwa)

Vite PWA plugin + manifest + offline support

## Category
Infrastructure

## Description
Configures vite-plugin-pwa for offline capabilities, service worker registration, and a complete web manifest for app-like behavior.

## Problem it Solves
Websites without PWA support feel slower and cannot work offline or be installed on mobile devices.

## Usage Information
- **Risk Level**: medium
- **Recommended Skill Level**: intermediate

### When to Use
Any web application where mobile experience and offline access are important.

### When NOT to Use
Internal dashboard apps where offline access is not possible/secure.

## Technical Details

### Files Created
- public/manifest.webmanifest
- src/pwa-register.ts

### Files Modified
- vite.config.ts
- package.json

### Dependencies
- **Runtime**: None
- **Dev**: vite-plugin-pwa

### Requirements
- Vite project

## Risks & Warnings
- Service workers can cache stale content if not configured correctly.

## Post-Installation Steps
- Customize manifest.webmanifest with your app colors and icons
- Verify offline support in DevTools
