# Theme System (theme)

ThemeProvider + useTheme hook + ThemeToggle component

## Category
UI

## Description
Creates a complete dark/light/system theme system with React context, a custom hook, and a toggle component.

## Problem it Solves
Dark mode is expected in modern apps. This provides a clean, reusable implementation.

## Usage Information
- **Risk Level**: low
- **Recommended Skill Level**: beginner

### When to Use
On any user-facing application that should support dark mode.

### When NOT to Use
Backend-only projects or if you use a UI library with built-in theming.

## Technical Details

### Files Created
- src/components/ThemeProvider.tsx
- src/hooks/useTheme.ts
- src/components/ThemeToggle.tsx

### Files Modified


### Dependencies
- **Runtime**: None
- **Dev**: None

### Requirements
- React 18+

## Risks & Warnings


## Post-Installation Steps
- Wrap your app with <ThemeProvider>
- Add ThemeToggle to your navbar
