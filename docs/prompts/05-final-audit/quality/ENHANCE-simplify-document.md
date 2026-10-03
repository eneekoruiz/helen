---
action: ENHANCE
phase: 05-final-audit
summary: Surgical document simplification pass — same content, lighter language. Applies KISS and DRY without altering structure or meaning.
modifies_code: false
aliases:
  - simplify-document
  - simplify-report
  - enhance-readability-pass
---

# Simplify Document

## Goal

Return the complete document with the same structure, the same information, and the same length — but with any paragraph, sentence, or word that "creaks" (overly technical, jargon-heavy, unnecessarily dense, or repetitive) rewritten into plain, human language. The rest must remain almost identical.

## Use when

- You have read a report or article two or more times and it still has 3–5 paragraphs that feel too academic, technical, or robotic.
- You want a cleaner reading experience without losing detail, nuance, or the existing voice.
- You need the full document returned — not a summary, not a list of suggestions.

## Scoping questionnaire (ask before running)

Present these two targeted questions and wait for answers before making any changes:

1. **Simplification depth:**
   - A) Light touch — only rewrite sentences that clearly creak; minimal changes everywhere else.
   - B) Moderate — simplify any paragraph with unnecessary complexity, passive voice, or academic tone.
   - C) Deep pass — rewrite for maximum clarity and human voice throughout.

2. **Technical vocabulary:**
   - A) Preserve all technical terms exactly (target audience is expert).
   - B) Keep key technical terms but briefly gloss the most obscure ones (one-line inline explanation in parentheses).
   - C) Replace technical jargon with plain equivalents where possible without loss of precision.

## Requirements

Apply changes strictly within the scope confirmed in the questionnaire. Every requirement below is non-negotiable:

1. **Return the full document.** No truncations, no ellipses, no "the rest remains unchanged." The user must receive a complete, ready-to-use version.

2. **KISS (Keep It Simple, Stupid):** Every rewritten sentence must be shorter and cleaner than the original. If a sentence survives simplification unchanged, it was already fine — keep it.

3. **DRY (Don't Repeat Yourself):** If the same idea appears more than once across paragraphs (identical claims, repeated definitions, restated conclusions), merge or cut the duplicate occurrence. Do not introduce new content to compensate.

4. **Preserve meaning precisely.** Never change numbers, dates, names, claims, conclusions, or findings. Never add opinions, caveats, or new information. Never soften hard conclusions.

5. **Preserve structure.** Maintain all headings, subheadings, bullet lists, tables, and their order. Only the prose inside changes.

6. **Preserve voice.** Match the register of the parts that do not creak. If the document is formal, do not go casual. If it has personality, preserve it.

7. **No AI tropes.** Do not introduce: hollow transitions ("Furthermore, it is worth noting…"), fake rhetorical questions, staged run-ups ("Now more than ever…"), inflated importance, symmetric triples, or any pattern that sounds like automatic writing.

8. **One-pass output.** Apply all edits in a single, complete rewrite. Do not ask for per-paragraph approval or provide a changelog unless explicitly requested.

## Limits

- Do not change the document's conclusions, structure, factual claims, or cited data.
- Do not add new sections, examples, or context not already in the original.
- Do not summarize. The output length should be within ±10% of the input length.
- Do not ask for approval mid-pass once scope is confirmed.

## Output

Return the complete simplified document in the same format as the input (Markdown, plain text, etc.), followed by a single compact diff-summary block:

```text
Simplification summary:
- Paragraphs rewritten: N
- Duplicate passages merged: N
- Technical terms glossed: N
- Net length change: ±N%
- Sections left unchanged: [list]
```
