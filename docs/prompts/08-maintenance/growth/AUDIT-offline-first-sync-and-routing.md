---
action: AUDIT
phase: 08-maintenance
summary: Audit offline-first apps: app shell and offline routing, local persistence, sync and conflict handling, search and data normalization.
modifies_code: false
aliases:
  - audit-password-manager-ux-routing-and-offline
---

# Offline-First, Sync and Routing Audit

## Goal

Find the root causes of data loss, desynchronization, raw offline errors and confusing navigation in offline-first apps and PWAs (for example credential managers, notes, field tools).

## Use when

- Before shipping a PWA or local-first app; when users report lost data, stale data or strange navigation.

## Skip when

- The app has no local persistence and no offline requirement.

## Requirements

1. **Navigation logic:** selecting an item opens its detail (never a surprise "create" modal); related records grouped with clear actions to add more.
2. **No clipped content:** long values wrap (`overflow-wrap: anywhere`, `break-words`) and revealed secrets or long text grow vertically instead of being cut.
3. **Offline shell:** the service worker serves the app shell offline; client-side routes work without network (Cache First or Stale-While-Revalidate for navigation); a friendly offline notice instead of raw server errors.
4. **Search and autocomplete:** free typing; no auto-selecting the first result; selection only by click, Enter or deliberate choice; aliases and spelling variants resolve to the same entity.
5. **Normalization:** each entity has a unique id, canonical name, aliases and metadata; existing entities are suggested instead of creating duplicates.
6. **Sync:** sync on start and after every write; offline operations queued (IndexedDB) and replayed on reconnect; timestamps or versions for conflict resolution without overwriting; visible sync status (last sync, pending changes, errors).
7. **Security:** local data encrypted like the server copy; master secrets never stored in plain text.

## Beyond the checklist

Battery impact of background sync on mobile; smooth transitions between online and offline states.

## Limits

- Audit only. Never copy real user data or secrets into the report.

## Output

Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort. Include the root cause and the problematic code for each finding. Critical = data loss, raw 404s, blocked navigation or search.
