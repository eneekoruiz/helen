# Prompt Taxonomy and Anti-Duplication Rules

This library should feel precise, not inflated.

## Core Rule

One user intention gets one canonical prompt.

If two prompts answer the same question with slightly different intensity, merge them into one prompt with modes, levels, or sections.

## Layers

1. **Prompt**
   A reusable expert audit for one domain or intention.

2. **Step**
   An operational action used inside flows. It may overlap with a prompt's domain, but it must be narrower and execution-oriented.

3. **Checkpoint**
   A gate that decides whether an agent may continue.

4. **Flow**
   An ordered orchestration of prompts, steps, and checkpoints.

5. **Registry**
   Machine-readable discovery metadata.

## When to Add a New Prompt

Add a prompt only when at least one is true:

- it covers a materially different professional domain;
- it has different evidence requirements;
- it has different stop conditions;
- it requires a different expert persona;
- it would prevent a class of late-discovered problems;
- it changes the decision a user or agent would make.

## When to Merge Instead

Merge prompts when:

- they inspect the same surface;
- they differ mostly by intensity;
- one is just a more glamorous version of the other;
- their output formats are nearly identical;
- a flow could choose the ambition level instead.

## Naming Rules

Names must explain the job without opening the file.

Good:

- `product-design-and-awards-visual-excellence-audit`
- `staff-architecture-audit`
- `clean-code-architecture-audit`
- `release-readiness-checkpoint`

Weak:

- `general-improvement`
- `premium-pass`
- `audit-final`
- `polish`

## Flow Naming Rules

Flows should name the journey, not just the topic:

- `full-polish`
- `release-candidate`
- `client-delivery`
- `clean-code-architecture-audit`
- `awwwards-soty-design-review`

## Step Naming Rules

Steps should name the action:

- `responsive-pass`
- `fast-build-test-verification`
- `security-hardening`
- `loading-error-empty-states`

## Review Ritual

Before adding a prompt, ask:

1. Is this a new domain or just a stricter version of an existing prompt?
2. Could this be a mode inside an existing prompt?
3. Is it a prompt, step, checkpoint, or flow?
4. Would a user understand the name in a CLI list?
5. Does it reduce confusion or add library sprawl?
