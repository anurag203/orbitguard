# AI Briefing and Reporting LLD

## Purpose

Turn computed OrbitGuard outputs into grounded mission briefings and audit-ready reports that judges can trust.

## Responsibilities

- Generate plain-English explanations from computed metrics.
- Produce maneuver reports.
- Preserve assumptions, inputs, outputs, and decision reasoning.
- Prevent hallucinated metrics.
- Support export-ready report formats.

## Non-Responsibilities

- Do not compute orbital mechanics.
- Do not invent facts not present in engine output.
- Do not require an external LLM for the demo.

## Implementation Plan

- Start with deterministic template-based briefings.
- Build report sections from structured data: conjunction, assumptions, candidates, selected maneuver, secondary screening, limitations.
- Generate reports by querying the current conjunction detail, maneuver plan, selected candidate, and secondary screening result.
- Add source IDs to every report so the audit trail is reproducible.
- Reject candidate mismatches instead of producing unsupported reports.
- Add optional LLM polish later only if it is strictly grounded in provided JSON.
- Store generated reports in memory or local file during MVP.
- Make every report reproducible from scenario run ID and maneuver plan ID.

## Data Flow

Computed metrics enter the reporting layer. The layer creates a briefing summary and a structured report. The frontend displays the summary and can request full report output.

## APIs / Interfaces

- `create_briefing(conjunction, maneuver_plan, secondary_result)`
- `create_report(report_request)`
- `get_report(report_id)`
- `render_printable_report(report_id)`

Implemented backend API:

- `POST /api/reports`
- `GET /api/reports/{report_id}`

## Data Models

- `BriefingInput`
- `BriefingOutput`
- `MissionReport`
- `ReportSection`
- `AssumptionDisclosure`

Current API response fields:

- `briefing.headline`
- `briefing.summary`
- `briefing.key_points`
- `briefing.limitations`
- `source_ids`
- `sections`
- `assumptions`
- `warnings`

## Algorithms / Logic

- Use templates with required metric placeholders.
- Validate that every numeric claim maps to an input field.
- Include uncertainty language when Pc is estimated.
- Include "not operational command authority" disclaimer.

Current Protect ISRO briefing includes:

- selected candidate ID,
- delta-v,
- burn direction and timing,
- before/after Pc,
- before/after miss distance,
- secondary screening status,
- screened object count,
- source IDs and TCA.

## Error Handling

- Missing required metric blocks report generation.
- Optional missing fields produce explicit "not available" labels.
- External LLM failure falls back to deterministic templates.
- Mismatched candidate IDs return validation errors.
- Plans without a recommendation block report generation.

## Performance Considerations

- Report generation should be fast and local for demo.
- Avoid blocking UI on optional export rendering.

## Security / Safety Considerations

- Sanitize report text.
- Do not include private filesystem paths.
- Do not overstate safety or precision.

## Test Architecture

- Snapshot tests for deterministic briefings.
- Schema tests for reports.
- Hallucination guard tests ensuring all metric strings come from input.
- Fallback tests when optional LLM is unavailable.

Implemented test coverage:

- Report contains delta-v, Pc, and miss distance from current maneuver outputs.
- Report contains secondary screening status.
- Report exposes source IDs.
- Report rejects candidate IDs that are not the selected recommendation.

## Test Cases

- Briefing includes selected delta-v and before/after risk.
- Missing Pc prevents unsupported Pc claim.
- Report contains assumptions section.
- Report includes secondary screening status.
- Printable report renders without external service.

Current test files:

- `../backend/tests/test_report_service.py`
- `../backend/tests/test_maneuvers_reports.py`

## Demo Acceptance Criteria

- A concise briefing appears after maneuver planning.
- Report export/generation is visible in the final demo.
- Briefing sounds impressive but remains scientifically honest.

## Final-Round Extensions

- Add PDF export.
- Add judge-facing one-page mission brief.
- Add optional local/hosted LLM polish with strict grounding.

## Context File Reference

`../context/10-ai-briefing-and-reporting-context.md`
