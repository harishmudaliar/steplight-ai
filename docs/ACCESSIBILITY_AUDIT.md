# Accessibility Audit Evidence

**Date:** 2026-10-25  
**Verdict:** **PARTIAL — no WCAG conformance claim**

## Checks performed

- Existing web tests exercise accessible feedback/error announcements for adaptive actions, keyboard behavior, and route behavior.
- In the live browser, the first Tab from the signup page focused the “Skip to main content” link.
- At a 390×844 viewport, `document.documentElement.scrollWidth` was 390 px; no horizontal overflow was observed on the signup screen.
- Emulated `prefers-reduced-motion: reduce` in the browser. The global stylesheet now reduces animation and transition durations to `0.00001s` and sets animation iterations to `1`; the browser computed these values on an animated element.
- Focus-visible styling and labeled controls are present in the existing UI; feedback mutations announce status/errors through live regions, as covered by web tests.

## Change made

`apps/web/src/index.css` now includes a global reduced-motion media query covering animations, transitions, and smooth scrolling. The previous stylesheet did not include a reduced-motion override.

## Not performed

- No axe-core/Lighthouse automated audit or manual WCAG success-criteria assessment.
- No screen-reader session with NVDA, Narrator, or VoiceOver.
- No exhaustive route-by-route check of contrast, zoom/reflow, focus order, dialogs, validation, or keyboard-only task workflows.
- No accessibility check of the packaged native Electron window.

These checks are a useful regression baseline, not evidence of full WCAG 2.2 AA compliance. See [Phase 11](./PHASE_11_REPORT.md) and [the test matrix](./TEST_MATRIX.md).
