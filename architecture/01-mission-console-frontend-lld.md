# Mission Console Frontend LLD

## Purpose

Provide OrbitGuard's primary website and mission-console experience as a clean, beginner-readable neon space product. The frontend should make the core idea understandable without space-domain knowledge: OrbitGuard protects a satellite, detects a dangerous close approach, recommends a small avoidance maneuver, checks secondary risk, and produces an auditable report.

## Responsibilities

- Render a modern routed React product with focused feature pages: `/`, `/mission`, `/catalog`, `/risk`, `/avoidance`, `/reports`, `/system`, and `/learn`.
- Keep global navigation opinionated and production-grade: Home via brand, five desktop primary tabs, secondary Intel dropdown, and a grouped mobile drawer.
- Provide a judge-facing Mission Director presenter layer that can launch from navigation, step through Command/Source/Rank/Simulate/Brief scenes, jump directly between scenes, and close cleanly.
- Provide global Mission Sync feedback that translates busy/error/ready states into short operator language and Source/Detect/Dodge/Brief progress without exposing raw store data.
- Keep the backend API as the source of truth for scenarios, catalogs, conjunctions, maneuvers, secondary screening, and reports.
- Present one clear user question per route, then progressively disclose technical evidence.
- Render an interactive Three.js Earth scene with a real space background, visible satellite/debris models, orbit trails, threat corridor, maneuver preview, drag rotation, corrected scroll zoom, reset, and keyboard controls.
- Explain specialist terms in plain language before showing abbreviations such as TCA, Pc, TLE, and delta-v.
- Preserve the Protect ISRO offline demo as the hero flow.
- Keep Home and app-shell readiness/status copy product-grade: use readiness sync, source sync, mission sync, and scenario sync rather than booting/loading placeholders.
- Present Mission as an operational cockpit: compact mission hero, dominant Earth stage, first-viewport Threat/Burn/Audit readiness briefing, phase stack, decision drawer, command rail, scenario deck, and evidence rhythm.
- Present Catalog as an orbital object browser: source status, source-sync state, signal metrics, guided mission lenses, source-mode toggle, active filter chips, resettable filter console, visual object rows, clean empty states, raw-placeholder-free metadata, protected/debris operator readings, object proof chips, object inspector, mini orbit preview, tags, lineage, and collapsed TLE evidence.
- Present Risk Board as an operational triage surface: focused threat summary, designed sync placeholders, scenario comparison, selectable severity lanes, lane-specific operator playbook, honest empty-lane states, compact risk radar, plain-English decision note, operator-ready ranking rows, and direct jumps to planner/source evidence.
- Present Avoidance as a burn-scan simulator: locked conjunction briefing, Simulation pre-flight readiness checks, an inspectable Lock/Scan/Select/Screen/Brief burn-sequence runbook, queued candidate slots before scan, visual Earth burn lab, before/after risk collapse, recommendation reveal, candidate matrix, and secondary-screening assurance.
- Present Reports as an audit briefing desk: a deliberate briefing queue before generation, planner/safety/evidence queue states instead of raw pending labels, a four-chapter judge briefing storyboard, Summary/Evidence/Assumptions/Export review modes, generated mission dossier, source IDs, assumptions, and export unlock state.
- Present Learn as a mission-school simulator: 30-second mental model, live mission metrics, selectable source/detect/dodge/prove training stages, active lesson briefing, judge-signal panel, readiness checks, glossary cards, route jumps, and explicit safety note.
- Keep technical evidence available for judges without dumping raw telemetry into the first viewport.
- Support desktop and mobile layouts without horizontal overflow or text overlap.

## Non-Responsibilities

- Do not compute authoritative orbital mechanics in the frontend.
- Do not generate ungrounded AI text.
- Do not introduce live network dependencies into the Protect ISRO hero demo.
- Do not change backend science contracts unless a route genuinely needs missing read-only display data.

## Implementation Plan

- Use React Router for real product routes.
- Use a small Zustand store for mission state and side effects: boot, scenario load, catalog filtering, maneuver planning/apply, report generation, and report export.
- Use shared UI primitives for route shells, navigation, metrics, status badges, disclosures, primary actions, and plain-language explainers.
- Keep primary navigation to the judge-critical path: Mission, Catalog, Predictor, Briefing, and System. Put Risk Board and Learn behind Intel and contextual route jumps.
- Split frontend source by responsibility: routes, layout, state, UI, visualization, API, formatting, and types.
- Replace the previous monolithic stylesheet with tokenized CSS files for base tokens, layout, components, route-specific styling, and visualization.
- Keep Vite proxy and existing FastAPI endpoints unchanged.

## Data Flow

On startup the store loads demo status, scenarios, the fixture catalog, Protect ISRO scenario run, top conjunction detail, and scenario risk snapshots. Routes consume this shared state:

- Home uses a full-bleed rotating Earth background, focused mission promise, compact Protect ISRO proof metrics, non-wrapping cockpit readouts, clear Earth controls, raw-placeholder-free readiness copy, and workflow modules to launch the mission.
- The Command Deck keeps route choice lightweight: Home through the OrbitGuard brand, primary workflow in the desktop dock, Risk/Learn in Intel, and all routes grouped in the mobile drawer.
- Mission Sync appears on operational routes as a concise status band: scenario title, mission-state copy, catalog/demo mode, and four stage chips.
- Mission Director is frontend presentation state only: Start Demo activates the presenter rail, routes to Mission, then manual cue controls navigate through Mission, Catalog, Risk, Avoidance, and Reports without changing backend science state.
- Mission shows a compact cockpit: mission lock, Earth, current threat, first-viewport readiness briefing, phase progression, risk metrics, next action, burn preview, scenario switching, and evidence rhythm.
- Catalog loads fixture/live catalog data, offers guided All Objects / Protected ISRO / Debris Threats / LEO Corridor lenses before free-form filters, classifies object rows, highlights protected/debris records, summarizes active filters as lens chips, provides reset and source-mode controls, shows selected-object operator readings, proof chips, lineage, and mini orbit preview, separates source-sync from no-results states, handles missing metadata with evidence language instead of loading/unknown/n-a labels, and exposes raw TLE only in collapsed evidence.
- Risk screens and ranks close approaches across scenarios through a tactical board with designed sync placeholders, scenario cards, selectable severity lanes, lane-specific playbook, focused threat summary, compact risk radar, and planner/catalog jumps.
- Avoidance plans and applies the maneuver for the active conjunction, while the pre-scan state explains the Simulation pre-flight, staged burn families, five-stage burn sequence, and secondary-safety gate instead of rendering raw loading placeholders. Direct `/avoidance` deep links self-hydrate the selected scenario once the scenario list is available so judges do not land on a dead simulator.
- Reports starts as a briefing queue, shows which plan/safety/source inputs are armed or queued, lets judges switch through Situation/Decision/Safety/Submission storyboard chapters and Summary/Evidence/Assumptions/Export review modes, then generates and exports the briefing from the current scenario, conjunction, plan, and candidate.
- System presents the backend pipeline as selectable module controls, a focused interface/evidence/test-proof inspector, validation lanes, readiness sync states, and limitations.
- Learn provides beginner-ready mission training, selectable stage lessons, judge-signal explanations, glossary explanations, route jumps back to operational proof, and a safety boundary.

## APIs / Interfaces

Existing frontend calls remain:

- `GET /api/demo/status`
- `POST /api/demo/replay/{flow_id}`
- `GET /api/scenarios`
- `POST /api/scenarios/{id}/run`
- `POST /api/conjunctions/screen`
- `GET /api/conjunctions/{id}`
- `GET /api/catalogs/full`
- `POST /api/catalogs/live/refresh`
- `POST /api/maneuvers/plan`
- `POST /api/maneuvers/apply`
- `POST /api/reports`
- `GET /api/reports/{id}`

No backend endpoint is required for the redesign unless later profiling shows the startup sequence needs a read-only aggregation endpoint.

## Algorithms / Logic

- Derive severity styling from API severity/status.
- Keep raw technical data collapsed by default while summary metrics stay visible.
- Prevent Apply until a valid recommended maneuver exists.
- Use active mission phase to color Earth overlays: alert, planned, applied, report.
- Use corrected wheel semantics: wheel up zooms in, wheel down zooms out.
- Preserve selected catalog object across filters where possible; otherwise choose the first returned object.
- Export reports as Markdown from browser-generated content.
- Respect reduced-motion preferences by limiting route and HUD animations.
- On Home, pass pointer events through empty hero space so the desktop Earth remains draggable while explicit CTAs/cards remain clickable.
- Keep Guided Demo presenter progress route-derived rather than timer-derived, so live judging and video recording stay synchronized with the page being shown.
- Derive Mission Sync from store state, but phrase it as product feedback: "Running avoidance planner", "Building mission briefing", "Secondary screening clear", etc.
- Derive shell/Home status labels through shared operator-label formatting so undefined or startup states become intentional sync states instead of raw backend terms.
- Derive the Avoidance burn sequence from mission state: geometry lock, burn scan, selected recommendation, secondary screen, and briefing readiness update as plan/apply/report actions complete.

## Error Handling

- If backend boot fails, show a concise retry state and keep navigation visible.
- If Home or the app shell is waiting for readiness, show readiness sync, mission sync, source sync, or scenario sync instead of booting/loading placeholders.
- If catalog live refresh fails, stay in fixture mode or show explicit offline fallback status.
- If catalog data or object metadata is not available, use source-sync / not-supplied evidence language rather than loading, unknown, or n-a labels.
- If Mission has not planned a burn yet, show a readiness briefing and armed action state instead of raw Loading/Awaiting labels after route settle.
- If risk snapshots or maneuver plans are not ready yet, show designed sync/pre-flight states rather than blank panels or raw Loading/Pending labels.
- If a report has not been generated yet, show the briefing queue and evidence-chain readiness language rather than draft/pending/not-planned backend labels.
- If System demo/catalog/scenario readiness is not available yet, show readiness sync, catalog sync, scenario sync, and checks arming rather than loading, booting, or ellipsis placeholders.
- If maneuver planning/apply/report generation fails, keep current mission data visible and show retry guidance.
- If the Earth texture fails, keep the scene nonblank with lighting, atmosphere, orbit trails, and labels.

## Performance Considerations

- Keep Three.js scene setup isolated from route text/layout state.
- Use store selectors and memoized derived arrays for ranked conjunctions, catalog rows, and candidate rows.
- Keep first viewport lightweight by collapsing raw evidence.
- Avoid rerendering the WebGL canvas during ordinary text/filter changes.

## Security / Safety Considerations

- Render API text as plain React text.
- Do not accept arbitrary script content in generated reports.
- Keep covariance assumptions and simplified-risk limitations visible.
- Do not present TLE-only demo estimates as operational spacecraft command authority.

## Test Architecture

- Unit tests continue covering formatting helpers.
- Playwright E2E covers all routes, Home first-impression placeholder guard, five-tab desktop Command Deck, Intel dropdown, grouped mobile drawer, Mission Sync landmark and four stage chips, Mission Director launch/scene count/next cue/direct scene jump/close, Mission cockpit structure, Mission action-briefing placeholder guard, Catalog browser/evidence flow, Catalog mission-lens switching, Catalog no-results/reset behavior, Catalog source/metadata placeholder guard, Risk Board lane playbook selection, Avoidance pre-flight placeholder guard, Avoidance five-stage burn-sequence inspection, scan-to-select state, apply-to-secondary-clear state, Reports queue-state placeholder guard, Reports four-chapter storyboard switching, Reports Summary/Evidence/Assumptions/Export review tabs, System readiness placeholder guard, System stage-inspector selection, Learn stage selection, Protect ISRO plan/apply/report/export, catalog evidence disclosure, corrected Earth zoom, Home desktop drag/zoom interaction, desktop overflow, and mobile overflow.
- Visual QA covers desktop and mobile route screenshots, Home full-bleed Earth readability, Home shell-readiness screenshots, clear Home Earth controls, non-wrapping Home telemetry readouts, Command Deck/dropdown/drawer screenshots, Mission Sync desktop/mobile screenshots, Mission Director presenter rail desktop/mobile screenshots, Mission cockpit desktop/planned/action-briefing/mobile screenshots, Catalog browser desktop/evidence/mobile/filter-empty/source-polish/mission-lens screenshots, Risk Board desktop/mobile/playbook screenshots, Risk Board sync fallback styling, Predictor burn lab before/after-plan/pre-flight/mobile/burn-sequence screenshots, Reports briefing desk queue/ready/mobile/review-console/storyboard screenshots, System command center desktop/mobile/readiness-polish/stage-inspector screenshots, Learn training simulator desktop/mobile/simulator-polish screenshots, satellite/debris visibility, and no text overlap.

## Demo Acceptance Criteria

- A first-time judge understands the product from the full-bleed Home route in under 30 seconds.
- The first viewport never leaks booting/loading placeholders: Home, top status, and Mission Sync use operator-grade sync language, and Home telemetry does not wrap or collide with Earth controls.
- Protect ISRO can be completed without typing: start mission, inspect risk, plan, apply, generate report, export.
- Judges can understand navigation immediately: five primary desktop routes, secondary Intel routes, and a compact mobile drawer under 96px topbar height.
- Operational routes show a compact Mission Sync strip that explains system state and stage progress without reading like debug output.
- A presenter can launch Guided Demo from the Command Deck and manually step through Command, Source, Rank, Simulate, and Brief without route confusion or clipped mobile controls.
- Earth appears in an obvious space environment and satellites no longer read as anonymous dots.
- Mission/risk/avoidance pages show one primary action each, and Mission exposes readiness through a Threat/Burn/Audit briefing before detailed phase evidence.
- Risk Board reads as a tactical triage board, not a data dump: focused threat, scenario comparison, selectable severity lanes, lane playbook, honest empty-lane states, operator queue, and clear planner/source jumps are visible before raw detail.
- Risk Board sync/loading states stay designed: scenario placeholders explain what is being prepared instead of leaving the comparison rail blank.
- Catalog reads as a controlled evidence browser: guided mission lenses lead the workflow, active filters are visible as lens chips, source mode is explicit, protected/debris operator readings are clear, source-sync and no-results states are distinct, empty states are useful, and no loading/unknown/n-a placeholder values leak into rows or the inspector.
- Predictor/Avoidance reads as a burn simulation: locked target, visual Earth stage, Simulation pre-flight readiness, inspectable burn-sequence runbook, queued candidate slots, before/after risk collapse, recommended burn, candidate matrix, and secondary-screening assurance are visible before raw assumptions.
- Reports reads as a mission dossier and presentation desk: briefing queue, Situation/Decision/Safety/Submission storyboard, tabbed Summary/Evidence/Assumptions/Export review, evidence chain, generated briefing, source IDs, assumptions, and export state are visible without dumping raw report internals or raw pending labels into the first viewport.
- System reads as a technical command center: release posture, readiness sync states, selectable decision pipeline, active module inspector, engine contracts, validation lanes, architecture evidence, limitations, and route jumps are organized for technical judges without loading/booting placeholder leakage.
- Learn reads as training, not documentation: a first-time judge can select Source/Detect/Dodge/Prove lessons, see what signal judges should look for, understand the mission model/vocabulary/workflow, and jump to the next proof route without seeing a raw data dump.
- Raw TLEs, assumptions, and detailed telemetry are available but not dumped into the first viewport.
- Desktop and mobile layouts have no horizontal overflow.
