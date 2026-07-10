# Task 9 Report: Air-Combat Route-Segment Asset Staging

## Result

Air Combat now creates image requests only for the current and next route segments. Current sources use high fetch priority, next-only sources use low priority, repeated plans are deduplicated, and advancing the route drops past-only JS cache references. Rendering remains synchronous: an incomplete or failed managed image returns `null` and the existing procedural drawing path runs immediately.

The enemy pool is shared by spawning and asset planning. Route data, combat rules, result payloads, Boss prototypes, and procedural fallbacks were not changed. Managed Boss art no longer falls through to the legacy `Image` cache while the managed image is still decoding.

## TDD Evidence

- RED: `npm run test:reality` failed at the new VM behavior check with `TypeError: assets.prepareStages is not a function`.
- GREEN: `npm run test:reality` passed.
- Source contract: `node debug/browser-modes-smoke.js` passed.
- Project syntax: `npm run check` passed for 77 JavaScript files.

The VM test covers zero requests before a plan, high/low priorities with distinct worlds 8 and 6, current/next planning, repeat-plan deduplication, incomplete-image `null` fallback, past-stage eviction, and a cache smaller than the full manifest.

## Fresh-Cache Browser Measurement

Chrome ran headless with a new temporary profile and `Network.setCacheDisabled({ cacheDisabled: true })`. Resource Timing and Chrome DevTools Protocol network events were collected from the real Air Combat briefing.

- Full manifest: 70 image URLs.
- Initial briefing: 12 unique requests and 12 JS cache entries.
- Current plan: 7 sources, all reported `High` priority.
- Next-only plan: 5 sources, all reported `Low` priority.
- Initial image transfer/encoded size: 7,122,215 bytes.
- Planned background: current world 8 and next world 8; only the three world-08 layers were requested.
- No unplanned world background was requested.
- First Boss was present at 12 seconds (`segmentIndex: 0`, state `playing`).
- At 30 seconds the run remained exception-free, had naturally defeated the first Boss and advanced to segment 1; player HP was 62.
- After exercising the real `nextSegment()` path once more, the cache held 16/70 sources for segments 2 and 3. Past Boss sources `boss-10-tide-core.png` and `boss-08-prism-judge.png` were absent.
- Across the measured briefing/play/transition window, 20 image requests occurred and each observed Boss PNG was requested exactly once.
- Browser runtime exceptions: 0.

Resource Timing does not expose request priority; the High/Low evidence above comes from Chrome's `Network.requestWillBeSent.request.initialPriority` for the same fresh-cache requests.

## Risks

- The measured fallback path is behaviorally covered by the VM test (`ready()` returns `null` for incomplete images) and by 30 seconds of exception-free browser play; the browser does not directly label which procedural draw branch painted each frame.
- The sampled route mapped both initial plans to world 8, so the real browser proved that no other world loaded, while the VM test provides the distinct-world 8/6 coverage.
- Cache eviction releases JavaScript references; already transferred browser resources remain subject to the browser's own memory/cache lifecycle.

## Review Fixes

Three review findings were covered by regressions before implementation:

- RED: the VM test observed a prefetched world-06 `Image` remaining `low` after its plan became current; the mode source contract rejected the old `sidePairs` wingman condition and missing derived-enemy contracts.
- GREEN: cache hits now update the existing `Image.fetchPriority` without assigning `src` again; wingman planning matches `Player.wings` via `difficulty.allyWings`; splitter and carrier plans include their `small` and `medium` child art without changing spawn pools or weights.
- Chrome fresh-cache recheck: `boss-08-prism-judge.png` changed from `low` to `high` on the same cached image while its request count stayed at one. The cache changed from 12/70 to 18/70 for the refreshed current/next plans, all three plan checks passed, and browser runtime exceptions remained zero.
