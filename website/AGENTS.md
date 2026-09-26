# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## EcoXchange visual source of truth

- Selected concept: `design-reference.webp`, the unified Operating Field direction generated on 2026-09-25.
- Use the dark Operating Layer visual system everywhere: blackened evergreen, mineral white, signal green, bold sans-serif display type, and restrained technical mono labels.
- Use cinematic infrastructure photography for the homepage, Data Centers, and case-study storytelling.
- Use structured diagram-led layouts for Platform, Finance Readiness, and explanatory content.
- Do not use the serif typography, warm ivory, copper, or orange treatments from the earlier concepts.
- Supporting pages may vary composition by purpose, but must share navigation, typography, color tokens, spacing, controls, motion, and footer behavior.

## Approved UX/UI refinement — 2026-09-25

- The approved upgrade refines the existing brand with mineral-white corporate backgrounds for explanation, editorial pages, and forms; dark evergreen remains on infrastructure heroes and the footer.
- Use one horizontal header, readable navigation, a roughly 1,200px content width, compact sections, and conventional rectangular assessment buttons beside explanatory copy. The old brand rail and circular hero CTA are superseded.
- The React application is the single implementation, including the `/preview.html` alias. Do not recreate a separate static preview renderer.
- Preserve existing routes and API fields. Show assessment success only on a successful API response with `ok: true`; never simulate submission success because the site is in development.
- Keep existing image assets, responsive diagram descriptions, keyboard access, and reduced-motion support. Remove implementation notes and empty profile placeholders from visitor-facing content.

