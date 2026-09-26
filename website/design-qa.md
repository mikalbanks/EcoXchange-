# EcoXchange design QA

final result: passed

## Comparison target

- Source visual truth: `design-reference.webp` (1230 x 1277 px), the previously approved dark Operating Field concept.
- Implementation: `http://127.0.0.1:4173/preview.html`, React/Vite preview, homepage at the initial state.
- Implementation evidence: browser-rendered screenshot captured from the local preview during this QA pass. The visible browser viewport was 700 x 572 CSS px; an additional CSS metrics check was run at 1440 x 900 and 390 x 844.
- State: homepage at scroll top, analytics preference visible, mobile menu closed, reduced-motion preference not forced.

The current brief intentionally changes the source composition: the left identity rail and circular hero button are replaced by a horizontal header and rectangular primary action. QA therefore checks the approved visual language and the requested hierarchy changes rather than pixel equality with the earlier concept.

## Evidence and checks

- Full view: evergreen hero, sans-serif typography, signal green accent, infrastructure photography, centered content width, and rectangular hero actions are visible in the rendered preview.
- Focused regions: hero/header and assessment form were inspected. The hero presents the offer immediately, places “Assess your site” beside “Explore the platform,” and removes forced line breaks. The assessment has explicit step headings, bounded inputs, required guidance, Back/Continue behavior, and an honest unavailable state when `/api/assessment` is not running locally.
- Responsive layout: CSS viewport checks passed at 1440 px, 768 px, 390 px, and 320 px widths with no horizontal overflow. The mobile menu starts closed, exposes `aria-expanded`, closes on Escape, and restores focus to its trigger.
- Accessibility: visible focus styles, skip link, main landmark, labelled form fields, field-level errors, focus on the first invalid field, FAQ `aria-expanded`/region relationships, reduced-motion CSS, and text alternatives for diagrams were verified.
- Console: no browser error or warning entries were reported during the final preview checks.

## Required fidelity surfaces

- Fonts and typography: Inter is used for display/body text and IBM Plex Mono for secondary labels. Display sizing is reduced to a responsive 42–72 px range, body copy is 16–18 px, and navigation/control labels remain readable.
- Spacing and layout rhythm: sections use a centered 1200 px container, consistent section padding, rectangular controls, and shared header/footer spacing. The mobile grid collapses without clipping.
- Colors and tokens: dark evergreen remains on the hero/footer, mineral white is used for explanatory sections and forms, and signal green is reserved for accents and primary actions.
- Image quality and asset fidelity: supplied/generated switchgear, campus, and capacity-system assets load successfully with responsive object-fit treatment and text alternatives. No handcrafted image replacements were introduced.
- Copy and content: the homepage and supporting pages explain site readiness, onsite resources, operating constraints, telemetry, verification, and the path toward aggregation without unsupported customer claims or fabricated metrics. Implementation notes and empty team placeholders are removed from visitor-facing pages.

## Verification history

1. Earlier preview used a simplified static renderer with a brand rail, oversized hero treatment, incomplete routes, and an assessment that stopped after contact details.
2. React implementation now owns `/preview.html` and all routes. The navigation, light explanatory surfaces, multi-step assessment, mobile behavior, and unavailable submission state were implemented.
3. Post-fix evidence: Vite production build succeeded; all four Sites packaging tests passed; direct routes returned 200 from Vite; unknown routes render the React 404 screen; FAQ expansion and assessment validation were verified in-browser.

## Remaining test gap

The local environment does not have production Turnstile, HubSpot, or Sanity credentials, so only the unavailable API path was exercised. Live CRM submission and publishing remain outside this UI upgrade.

