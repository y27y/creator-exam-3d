# Task 8 Report: Fixed Story Cinematics

## Baseline and scope

- Baseline: `15a2408`
- Integrated the four Task 7 CG assets into the existing main-page, Night Watch, and Air Combat seams.
- Kept Air Combat state, briefing slides, context/result storage keys, payload shape, and live creation behavior unchanged.

## RED

- `node debug/browser-demo-smoke.js` failed with `main flow should use cg-prologue.webp`.
- `node debug/browser-modes-smoke.js` failed with `Night Watch should use the local panorama`.
- A placement review found the ending call in the Night Watch result seam. The main smoke was narrowed to the `applyAirCombatResult()` block and failed with `air result should open the ending plate` before the call was moved.

## GREEN

- `node debug/browser-demo-smoke.js` — PASS
- `node debug/browser-modes-smoke.js` — PASS
- `node debug/art-assets-tests.js` — PASS (`5 files, 449254 bytes`)
- `npm run check` — PASS (`77 JS file(s)`)

## Behavior delivered

- Main page reuses one accessible fixed cinematic dialog for the session-scoped prologue and the first Air Combat result ending.
- Opening a cinematic locks turn controls; skip, primary action, and Escape restore the prior lock state. Focus moves to the title, then to creation input or the world drawer as appropriate.
- Night Watch reuses one panorama at left, center, and right crops across the existing three-slide flow, with modal semantics and the existing next-button focus.
- Air Combat adds the bridge CG behind the existing briefing menu through CSS only.
- Every CG keeps a solid-color and gradient fallback if the WebP cannot decode.

## Remaining risk

- Verification is source-contract, asset, and syntax based; no interactive browser visual pass was run in this task.
- The prologue is marked seen when dismissed, so a reload before dismissal intentionally shows it again.
