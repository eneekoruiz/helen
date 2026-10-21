# Tournament of ideas

For a user requesting many different ideas from persona/product perspectives,
produce that exact number of concrete candidates, then a recorded elimination
bracket. This is not the original one-fresh-agent-per-competitor Arena mode.

## Contract and diversity

- Write one standalone task and acceptance contract before generating proposals.
  Include provided constraints, actual artifacts, and unknowns. Do not embed a
  preferred solution or make up usage data.
- Deal unique persona/product/reasoning/skill cards. Persona means a relevant
  behavior or constraint, not demographic stereotypes. A different label on the
  same mechanism is not a different proposal; regenerate duplicates.
- Each candidate states a concrete mechanism, what becomes visible/disclosed,
  access to preserved actions, strongest benefit, failure case and verification.
- Divide generation into disjoint worker batches within real concurrency limits.
  Keep the exact same task contract for everyone. Label batching honestly.
- Save candidates in a machine-readable file with stable unique IDs. Validate the
  exact requested count, uniqueness, and required fields before judging.

## Elimination

- A judge must not evaluate candidates it authored. Give judges anonymized IDs,
  the fixed task and proposals, without author identity or strategy cards.
- Pair different mechanisms first using a recorded seed. Each match records an
  attack on each proposal, the concrete counterexample, concession/rebuttal,
  revision, scores and winner. Every score must have a task-specific reason.
- Rubric (0–100): requirement preservation 30, task usefulness 25, robustness to
  attack 20, implementation specificity 15, legibility/discoverability 10.
  A verified fatal regression cannot win against a proposal without one.
- Judges can process disjoint batches of matches, but must write each match's
  individual verdict. Never replace the bracket with a list of favorites.
- Odd rounds use a bye; do not repeat a bye while another survivor has not had
  one. Carry the revised winning proposal forward. For 100 candidates the sizes
  are 100 → 50 → 25 → 13 → 7 → 4 → 2 → 1, totaling 99 matches.
- Validate each round: every entrant participates once or has the single bye,
  winners belong to their pairs, no eliminated ID returns, and one champion
  remains. If evidence changes, run a new bracket or disclose the change.

## Result and application

Report the champion, strongest surviving objections, actual candidates/rounds/
workers, and a link to the full record. State that synthetic judging does not
prove real user preference. If implementation was requested, implement the
winner while preserving the contract, then use an independent live evaluator,
focused regressions and required repository checks. Revise concrete failures;
do not inflate subjective scores to declare completion.

## Application-wide refinement

When the user expands implementation to all screens, lists and modals, inventory every source surface and relevant live fixture. Rank observed weaknesses by task impact and evidence; do not invent usage percentages. Use the champion as a coherent main direction, and incorporate compatible repairs from eliminated proposals with explicit proposal IDs and reasons. Record retained surfaces and why they already work. Preserve all original actions, hooks, persistence and backend behavior. Verify complete action reachability, keyboard and mobile geometry, and record credential-dependent states that could not be exercised. Independent critique must be followed by concrete repairs and a final reevaluation; a tournament score is not proof of usability.
