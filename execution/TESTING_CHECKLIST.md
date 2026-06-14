# Testing Checklist

## Backend

- [x] Unit tests for catalog parsing.
- [x] Unit tests for propagation.
- [x] Unit tests for conjunction screening.
- [x] Unit tests for Pc estimation.
- [x] Unit tests for maneuver ranking.
- [x] Unit tests for secondary screening.
- [x] Unit tests for report grounding.
- [x] Unit tests for demo readiness and replay.
- [x] API contract tests.

## Frontend

- [x] Mission console loads.
- [x] Mission director strip shows active objective, primary asset, miss distance, Pc, state, and primary actions.
- [x] Mission director Plan Avoidance action drives the maneuver candidate matrix.
- [x] Mission Control cockpit keeps the Earth stage dominant, side rails slim, command bar unclipped, and TCA readable.
- [x] Mission route production cockpit shows compact hero, mission lock, dominant Earth stage, Threat Focus overlay, four command actions, four phase steps, decision drawer, burn preview, scenario deck, evidence rhythm, and no raw telemetry dumping.
- [x] Mission route pre-plan state shows a first-viewport Threat/Burn/Audit readiness band, no raw Loading/Awaiting labels after route settle, compact tool-screen typography, and zero horizontal overflow.
- [x] Mission route mobile view shows the Earth stage in the first viewport with no horizontal overflow.
- [x] Cinematic home route explains OrbitGuard before operational tools.
- [x] Home route shows a production-grade full-bleed Earth hero, mission proof metrics, compact mission lockup, and workflow modules.
- [x] Home Earth hit area supports drag/zoom on desktop while mobile hero remains uncluttered and shows the next section in the first viewport.
- [x] Home and app-shell readiness states avoid raw booting/loading placeholders, keep cockpit readouts non-wrapping, and keep Home Earth controls clear of telemetry cards.
- [x] Compact Command Deck stays under laptop/projector height targets and mobile topbar stays under 96px.
- [x] Desktop Command Deck exposes only five primary tabs: Mission, Catalog, Predictor, Briefing, and System.
- [x] Desktop Intel dropdown exposes Risk Board and Learn without horizontal overflow.
- [x] Mobile mission drawer opens, shows grouped command/Intel routes, preserves the avoidance planner accessible name, navigates routes, and closes after Start Guided Demo.
- [x] Guided demo launches Mission Control and shows the five-scene Mission Director rail.
- [x] Mission Director rail shows Command, Source, Rank, Simulate, and Brief scenes with current recording cue and Next/Prev route controls.
- [x] Mission Director Next Cue navigates from Mission Control to Catalog / Source without horizontal overflow.
- [x] Mission Director direct scene jumps navigate to Simulate / Predictor, close cleanly, and preserve desktop/mobile no-overflow layout.
- [x] Mission Sync strip shows plain-language system state, Source/Detect/Dodge/Brief pipeline progress, catalog mode, and desktop/mobile no-overflow layout.
- [x] Product navigation reaches Mission Control, Catalog, Collision Predictor, Closest Approach, Reports, System, and Learn routes.
- [x] Scenario controls work.
- [x] Worklist renders.
- [x] Detail panel renders.
- [x] Copilot panel renders.
- [x] Before/after metrics update.
- [x] Report flow renders.
- [x] Desktop and mobile layouts have no horizontal overflow.
- [x] WebGL mission scene is nonblank and visibly animates over time.
- [x] 3D Earth supports drag-to-rotate, zoom in/out, scroll zoom, reset, and keyboard nudges.
- [x] Applied maneuver state locks the Apply control and promotes the briefing panel.
- [x] Real Earth texture loads from committed NASA Blue Marble asset.
- [x] Candidate matrix renders after maneuver planning.
- [x] Mission Control cockpit command bar drives Plan, Apply, Replay, and Report actions.
- [x] Mission Control context drawer exposes Decision, Risk, Catalog, and Evidence tabs.
- [x] Report Markdown export is visible after report generation.
- [x] Report Markdown export downloads expected maneuver content.
- [x] Reports route opens with a useful draft briefing desk before generation.
- [x] Reports route shows command summary, draft dossier, review stack, generated export ribbon, source IDs, audit columns, Markdown export action, and zero horizontal overflow.
- [x] Reports production briefing desk shows command hero, generator card, four status metrics, four draft outline cards, evidence chain, generated mission dossier, key points, source IDs, assumptions disclosure, export unlock state, mobile-safe stacking, and zero horizontal overflow.
- [x] Reports pre-generation queue state uses briefing/planner/safety/evidence queue language, blocks raw pending/not-planned labels, keeps export disabled until generation, and remains desktop/mobile overflow-free.
- [x] Reports review console exposes Summary, Evidence, Assumptions, and Export modes, keeps evidence organized inside the dossier, uses a two-column mobile tab layout, and remains desktop/mobile overflow-free.
- [x] Reports presentation storyboard exposes Situation, Decision, Safety proof, and Submission chapters, supports chapter switching before/after generation, keeps source IDs behind evidence panels, and remains desktop/mobile overflow-free.
- [x] Full Catalog workbench searches and filters fixture objects.
- [x] Catalog route presents a tactical sensor summary band, rich object rows, and top-priority object inspector.
- [x] Catalog production browser shows source status, signal metrics, filter console, visual object rows, protected/debris classifications, rich inspector, mini orbit preview, tags, lineage, collapsed raw TLE evidence, and no raw data dumping.
- [x] Catalog mission lenses switch between All Objects, Protected ISRO, Debris Threats, and LEO Corridor, and update the object inspector with protected/debris operator readings.
- [x] Catalog filter console shows source-mode toggle, active lens chips, neutral placeholders, reset controls, no-results list state, and clean no-selection inspector state.
- [x] Catalog source and metadata states avoid raw loading/unknown/n-a labels across initial, empty-filter, reset, and selected-object states.
- [x] Catalog mobile view reaches the filter console inside the first viewport with no horizontal overflow.
- [x] Catalog object inspector selects rows and shows NORAD, owner, orbit, type, tags, source lineage, and raw TLE evidence.
- [x] Catalog object inspector shows a mini orbit preview for selected objects.
- [x] Protect ISRO catalog objects expose a mission jump action.
- [x] Live CelesTrak/TLE refresh enters live mode or explicit offline fallback.
- [x] Predictor route shows Risk Simulator before/after comparison and burn-scan action.
- [x] Predictor burn-scan route shows target tags, scan status strip, candidate spotlight, recommended-burn reveal, mobile-safe stacking, and zero horizontal overflow.
- [x] Predictor production burn lab shows locked conjunction briefing, dominant Earth stage, encounter HUD, copilot decision drawer, before/after risk-collapse board, `>99%` Pc reduction, five visible candidate cards, secondary-screening assurance steps, honest low-speed m/s formatting, and zero horizontal overflow.
- [x] Predictor/Avoidance pre-flight state shows Simulation pre-flight readiness checks, queued candidate slots, action-oriented placeholder copy, no raw Loading/Pending/Waiting labels, compact mobile composition, and zero horizontal overflow.
- [x] Predictor/Avoidance burn-sequence runbook shows Lock/Scan/Select/Screen/Brief stages, supports stage inspection, advances from scan to selected burn to secondary clear, self-hydrates direct deep links, and stays desktop/mobile overflow-free.
- [x] Cinematic replay toggles and shows scenario-timeline captions.
- [x] Cinematic previous/next beat controls advance visible scenario captions for presenter-driven replay.
- [x] Closest Approach compares all three final-round scenarios and stacks mobile values cleanly.
- [x] Closest Approach tactical board shows command summary, nearest-object action state, three severity lanes, scenario switching, redesigned ranking rows, and zero horizontal overflow.
- [x] Risk Board production view shows command hero, focused threat summary, scenario comparison cards, three severity lanes, operator-ready threat queue, planner/catalog jumps, mobile-safe stacking, and zero horizontal overflow.
- [x] Risk Board playbook view has selectable Action/Watch/Track severity lanes, lane-specific operator guidance, honest empty-lane states, compact radar visual, mobile-safe stacking, and zero horizontal overflow.
- [x] Risk Board data-sync state shows designed scenario placeholders rather than a blank comparison rail.
- [x] System Architecture route renders decision pipeline, core engines, validation matrix, and evidence jumps.
- [x] System Architecture tech-tree shows command status band, four status cards, six connected pipeline nodes, six engine modules, four validation lanes, evidence jump navigation, and zero horizontal overflow.
- [x] System Architecture evidence jumps navigate into operational routes.
- [x] System production command center shows release posture, four status metrics, six linked pipeline cards, four validation lanes, six engine contract cards, architecture/operator evidence cards, limitations, evidence route jumps, mobile-safe stacking, and zero horizontal overflow.
- [x] System readiness states avoid raw loading/booting/ellipsis placeholders and show readiness sync, catalog sync, scenario sync, or explicit ready/attention metrics.
- [x] System stage inspector exposes six selectable pipeline controls, active module interface/evidence/test-proof detail, proof-route action, separate four-card validation band, mobile-safe stacking, and zero horizontal overflow.
- [x] Learn production route shows command hero, 30-second mission model, four stat cards, selectable four-stage training simulator, active lesson briefing, judge-signal panel, four readiness checks, eight glossary cards, five route jumps, safety note, mobile-safe stacking, and zero horizontal overflow.
- [x] Committed website smoke covers Protect ISRO, 2009 Replay, Kessler Sandbox, desktop, and mobile.
- [x] Committed Playwright E2E covers landing CTAs, Home first-impression raw-placeholder guard, guided demo Mission Director rail, Next Cue navigation, direct scene jump, rail close behavior, Mission Sync landmark/pipeline, route launchpad, deep links, mobile drawer close behavior, mission production cockpit, Mission action-briefing raw-placeholder guard, mission director/cockpit actions, context drawer tabs, catalog filters, Catalog mission-lens switching, Catalog no-results/reset state, Catalog source/metadata raw-placeholder guard, object inspector/TLE/orbit evidence, live refresh/fallback, replay, cinematic beat stepping, drag/zoom/reset Earth interaction, Risk Board scenario/lane/playbook/ranking/planner/catalog flow, Risk Simulator, Avoidance pre-flight raw-placeholder guard, Avoidance burn-sequence inspection/state progression, Reports queue-state raw-placeholder guard, Reports storyboard chapter switching, Reports review tab switching, System readiness raw-placeholder guard, System stage-inspector selection, scenario comparison, system architecture command center, Learn production training simulator/stage selection/path/System jump, draft/generated reports, briefing desk evidence/export unlock states, exports, desktop, and mobile.
- [x] Playwright/in-app browser visual QA covers home, home-shell-readiness polish desktop/mobile, command deck navigation desktop/Intel/mobile, Mission Sync desktop/mobile, mission production cockpit desktop/planned/action-briefing/mobile, catalog production browser desktop/evidence/mobile/source-polish/mission-lens, Catalog filter-console workspace/empty/mobile, Risk Board desktop/mobile/playbook, Predictor production burn lab before/after-plan/pre-flight/mobile/burn-sequence, Reports production briefing desk draft/ready/queue/mobile/review-console/storyboard, System production command center desktop/mobile/readiness-polish/stage-inspector, Learn production training simulator desktop/mobile/simulator-polish, Mission Director production rail desktop/mobile, catalog inspector desktop/mobile, mission-control, Mission Director rail desktop/mobile, mission director desktop/mobile, visible mission beat captions, interactive Earth controls, closest-approach, predictor risk simulator, system architecture desktop/mobile, reports draft/generated view, and mobile home/mission/closest-approach with no horizontal overflow.

## Scenario

- [x] Protect ISRO deterministic flow passes.
- [x] 2009 Replay fixture loads and resolves final-round conjunction/planning preview.
- [x] Kessler Sandbox fixture loads and resolves final-round conjunction/planning preview.

## Demo

- [ ] Clean clone startup passes.
- [x] Backend offline replay passes.
- [x] Full frontend offline mode passes against local deterministic backend.
- [x] Protect ISRO flow completes under 3 minutes in headless smoke.
- [x] All scenario buttons are exercised by website smoke.
- [x] All final-product website workflows are exercised by Playwright E2E.
- [x] Full `make release-check` passed after the previous full redesign.
- [ ] Retry full `make release-check` after Home/navigation/Mission Sync/Mission/Catalog filter console/Risk/Predictor/Reports/System/Learn/Mission Director production passes once Docker Hub metadata access recovers.
- [x] No placeholder UI text remains in the implemented vertical slice.
- [x] Video path tested before recording.
