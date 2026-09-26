# EcoXchange Sanity schema

`schemaTypes.ts` contains the production content model for pages, insights, case studies, team members, FAQs, proof points, site settings, SEO, and reusable page sections.

Import `schemaTypes` into a Sanity Studio `sanity.config.ts`. The website can be connected after `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET`, and `VITE_SANITY_API_VERSION` are supplied. Keep write tokens server-side; the marketing site only needs public read access or a read-only token proxied by the Worker.

Do not publish case-study logos, performance values, or customer claims until `permissionsConfirmed` and the proof point source are reviewed.

