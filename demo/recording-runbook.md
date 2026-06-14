# Recording Runbook

## Purpose

Use this file when recording the FAR AWAY submission video after the minimal neon redesign. The route flow now teaches the mission first, then opens technical proof only when needed.

## Pre-Flight

1. Start Docker Desktop or run the local backend/frontend servers.
2. From the repository root, run `make release-check`.
3. Open `http://localhost:5173`.
4. Use a desktop viewport around `1440x940`.
5. Keep browser zoom at `100%`.

## Recording Flow

1. `/`
   Show the simple promise: OrbitGuard protects a satellite from debris. Keep the Earth visible with the space background and object labels.
2. `/mission`
   Show Protect ISRO, the current threat object, closest approach, collision probability, and the single Plan Avoidance action.
3. `/catalog`
   Search or select CARTOSAT-2F. Open Raw TLE evidence to prove the catalog source is inspectable.
4. `/risk`
   Explain closest approach and collision probability in plain language, then show the ranked scenario cards.
5. `/avoidance`
   Run the burn scan, apply the recommendation, and show before/after risk collapse plus secondary screening.
6. `/reports`
   Generate the briefing, open source IDs and assumptions, and export Markdown.
7. Optional `/system`
   Close with the backend pipeline, engine modules, validation lanes, and honest limitations.

## Verbal Story

OrbitGuard starts with public orbital data, finds a dangerous close approach, explains what the risk means, recommends a small avoidance burn, checks that the dodge does not create a new danger, and exports an auditable mission briefing.

## Quality Checks

- The home page should be understandable without space knowledge.
- Earth should sit in a visible starfield, not a flat dashboard panel.
- Wheel up should zoom into Earth; wheel down should zoom out.
- Satellites and debris should read as small objects, not anonymous dots.
- Raw TLEs and assumptions should be available through disclosures, not dumped into the first viewport.
- The app must work without live CelesTrak by using deterministic offline fixtures.
