# CI/CD Pipeline (ci)

GitHub Actions CI workflow (typecheck, lint, test, build)

## Category
Infrastructure

## Description
Creates a GitHub Actions workflow that runs type-checking, linting, testing, and building on every push and PR.

## Problem it Solves
Without CI, broken code gets merged. This ensures every PR passes quality gates.

## Usage Information
- **Risk Level**: low
- **Recommended Skill Level**: beginner

### When to Use
On every project hosted on GitHub.

### When NOT to Use
If using GitLab CI or another CI provider.

## Technical Details

### Files Created
- .github/workflows/ci.yml

### Files Modified


### Dependencies
- **Runtime**: None
- **Dev**: None

### Requirements
- GitHub repository

## Risks & Warnings


## Post-Installation Steps
- Push to GitHub to trigger the workflow
