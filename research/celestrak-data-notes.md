# CelesTrak Data Notes

## Candidate Data Groups

- Active satellites.
- Debris groups.
- Stations.
- Special groups relevant to historical events.
- Any groups useful for Indian/ISRO assets.

## Snapshot Strategy

- Round 1 demo uses committed snapshots.
- Live refresh is useful but not required for the hero demo.
- Snapshot metadata should include source URL, fetch timestamp, object count, and license/source note.

## Risks

- Live fetch may fail during demo.
- Names and object grouping can change.
- Public TLEs do not include covariance.

## Required Output Later

- `data/README.md`
- snapshot manifest
- refresh script
- deterministic scenario fixtures
