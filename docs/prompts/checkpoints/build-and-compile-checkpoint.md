# Build and Compile Checkpoint

## Purpose

Confirm the project can build or compile before deeper polishing or release work continues.

## Command

Use the repo's real build command. Common candidates:

- `npm run build`
- `npm run typecheck`

## Manual Review

If no build command exists, inspect project scripts, docs, and source structure. Explain why no compile checkpoint can run.

## Blocks Progress

- Build fails.
- Type generation fails.
- Required environment is missing and not documented.
- The build only works because of local machine assumptions.

## Warning Only

- Non-blocking warnings that do not affect output.
- Missing optional optimization if the project is not release-bound.

## Recovery

Fix the smallest credible cause, rerun the checkpoint, and document the result.
