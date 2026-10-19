---
action: GENERATE
phase: 03-finish-features
summary: Create an editable PowerPoint for a TED-style talk with a strong narrative, editorial layouts and purposeful native animation.
modifies_code: true
aliases:
  - presentaciones
  - presentacion
  - powerpoint
  - ted-talk
  - generate-ted-presentation
---

# TED-Style PowerPoint Presentation

## Goal

Create the finished slides for a memorable live talk: a strong argument, useful evidence, distinctive contemporary art direction and carefully choreographed movement. Support the speaker and give the audience something worth looking at. Aim for the craft of an experienced presentation designer, with precise composition and specific writing throughout.

## Use when

- Creating a PowerPoint for a conference, TED-style talk, keynote, pitch or important public presentation.
- Turning supplied content or an existing deck into its final presentation version.

## Requirements

When available, read `helen work brief <id>` for the talk's agreed scope and decisions, and `helen creative show` for the shared identity. Reuse its references, type hierarchy, imagery, tone, purposeful motion and static fallback. Adapt to the supplied deck and explicit audience requirements; do not silently replace them with the kit. Record new material native-question answers in the feature dossier.

1. **Concretize the talk.** Reuse supplied material and decisions. Resolve only missing details that change the deck: audience, central message, speaking duration, language, slide count, venue/screen format, brand or references, and target PowerPoint version. Use the application's available native question form for those decisions; offer useful choices and free text rather than a fixed questionnaire. Distinguish an existing deck used as a template from one supplied only for its content. If the user requests N slides, count the cover within N. Check whether the available authoring tool can create editable objects, speaker notes, transitions and object animations before committing to them.

2. **Build a spoken narrative.** Give each slide a job in the argument. Open with a concrete question, tension, image or observation grounded in the subject; develop it through examples and evidence; close with a clear takeaway or action. Adapt this arc to the material rather than forcing a formula. Use natural, specific titles. Keep enough information to understand the point without turning the slide into the script. As a starting point, use one principal idea and roughly 20–40 visible words on ordinary talk slides; data, definitions and necessary caveats may need more. Put supporting explanation in speaker notes and optional appendix slides only within the agreed scope. Avoid empty one-word slides used solely to look dramatic.

3. **Establish a distinctive visual language.** Default to a contemporary editorial direction: bold typographic hierarchy, controlled asymmetry, generous negative space, confident image crops and a restrained palette with a purposeful accent. Adapt it to the topic, audience and supplied identity. Use a coherent grid and precise alignment, then vary composition to suit the content: immersive photography, a typographic statement, a focused chart, an annotated detail, a comparison or a visual sequence. Give the opening, important turning points and ending particular care. Avoid repeating one layout throughout, decorative card grids, stock icon rows and generic corporate or AI-template motifs. Do not confuse visual variety with a different design system on every slide.

4. **Use depth and imagery deliberately.** Combine photos, foreground cutouts, overlapping type, masks, selective shadows and different scales when they establish hierarchy or reveal something about the subject. Keep layers and their stacking order organized and editable where the format permits. Source relevant, well-composed assets; use supplied logos without distortion. Prefer an actual subject or useful detail over an unrelated stock image. Cropping must preserve the meaning of evidence. Keep data charts, required tables, labels and diagrams as native editable objects; do not flatten the entire slide into an image.

5. **Design for the room.** Use 16:9 unless the template or venue requires another format. Start around 44–72 pt for major titles and 24–32 pt for ordinary body text, adapting to the actual screen and audience distance. Reduce or restructure content before shrinking it. Target at least 4.5:1 contrast for ordinary text and 3:1 for large text; check over photographs and in a projector-like low-contrast view. Use a small, coherent set of available typefaces, consistent spacing, suitable line lengths and clearly readable chart labels. Provide alt text where supported. Preserve units, sources and caveats needed to interpret evidence.

6. **Choreograph advanced motion around the speech.** Plan animation cues with the speaker notes. Use progressive reveals to control attention, matching objects across slides for continuity, and native Morph, purposeful pan/zoom, restrained kinetic typography or layered movement when supported and useful. Make important visual moments distinctive; keep quieter explanatory slides calm. Use consistent timing and easing, with roughly 0.3–0.8 seconds as a starting range for ordinary transitions, adapting longer sequences to their explanatory purpose. Prefer presenter-controlled triggers during a live talk. Keep a stable final state long enough to read. Avoid gratuitous spins, bounces, unrelated transitions, constant movement and reveals that hide essential evidence. The talk must remain understandable with motion disabled and in a static backup.

   Where supported, give corresponding Morph objects unique matching `!!` names across slides and preserve a one-to-one mapping, following [Microsoft's Morph guidance](https://support.microsoft.com/en-us/powerpoint/morph-transition-tips-and-tricks). Charts cross-fade rather than geometrically morph. Also verify the sequence with [animations disabled](https://support.microsoft.com/en-us/powerpoint/change-remove-or-turn-off-animation-effects-in-powerpoint).

7. **Produce the real deliverable.** Create the final editable `.pptx`, not merely an outline, screenshots or a description of effects. Preserve existing content, slide count and branding that the user asks to retain. Implement native transitions and object animations when the toolchain supports them. A written animation plan is not an implemented animation: if a requested effect cannot be encoded, use a supported alternative where appropriate and identify the exact remaining manual action. Do not silently substitute a website or video for a PowerPoint. Add concise speaker notes with explanation, evidence sources and relevant cues. Prepare a static PDF backup when export is available and it fits the requested output.

8. **Review as a live presentation.** Render and inspect every slide at presentation scale and as a small thumbnail sequence. Check narrative continuity, required content, readable density, image resolution/crops, typography, contrast, alignment, overflow, overlaps and unintended template repetition. Check notes and editability. Inspect all animation states and transitions in the target player when available, including click order, timing, object stacking and the static fallback. A package/XML check or PDF render alone cannot verify animation playback. Rehearse against the requested duration when possible. Fix observed defects and make a final pass for useful improvements to the opening, key evidence and ending.

## Limits

- No invented facts, numbers, quotations, sources, client logos or unsupported claims. Separate assumptions from verified content.
- No generic AI phrases, filler slogans, lorem ipsum or commentary about making the deck on the slides.
- Do not discard important evidence to meet an arbitrary word budget, add unauthorized appendix slides or replace a requested visual identity with a default theme.
- Respect the user's writable-file boundaries, available tools and resource budget. Do not install software or purchase assets merely to add an effect.
- Do not claim that animations are implemented or tested in PowerPoint unless the file and actual playback support that statement. Do not promise the best presentation ever or guarantee audience/business results.

## Output

Deliver the final editable PowerPoint and, when produced, its static backup. Keep narration and sources in the speaker notes. State only the limitations that affect use: missing source material, unsupported effects, exact manual actions or playback that remains unverified. If authoring is unavailable, say so clearly and provide the usable storyboard/notes and motion specification as a provisional handoff, not as a finished deck.
