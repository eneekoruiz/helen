# Docker Setup (docker)

Dockerfile multi-stage + docker-compose.yml + .dockerignore

## Category
Infrastructure

## Description
Creates an optimized multi-stage Dockerfile (Node build + Nginx serve), a docker-compose.yml for local development, and a .dockerignore to keep images small.

## Problem it Solves
Manual Docker setup is error-prone and often results in bloated images. This provides a production-ready setup from day one.

## Usage Information
- **Risk Level**: low
- **Recommended Skill Level**: intermediate

### When to Use
When you plan to deploy via containers or want reproducible environments.

### When NOT to Use
If deploying exclusively to serverless platforms like Vercel or Netlify without Docker.

## Technical Details

### Files Created
- Dockerfile
- docker-compose.yml
- .dockerignore

### Files Modified
- package.json

### Dependencies
- **Runtime**: None
- **Dev**: None

### Requirements
- Docker installed locally for testing

## Risks & Warnings
- None — files are standalone and do not affect the build

## Post-Installation Steps
- Run docker compose up to test locally
- Customize nginx.conf if needed
