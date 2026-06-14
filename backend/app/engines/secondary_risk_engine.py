from __future__ import annotations

from app.models.maneuver import ManeuverCandidate
from app.models.secondary import SecondaryRiskResult


class SecondaryRiskEngine:
    def classify(self, candidate: ManeuverCandidate, fixture_result: SecondaryRiskResult | None) -> SecondaryRiskResult:
        if fixture_result is None:
            return SecondaryRiskResult(
                status="warning",
                summary="Secondary screening could not find a candidate-specific fixture, so the maneuver is not marked clear.",
                screened_object_count=0,
                concerns=[],
                assumptions=[
                    "Missing secondary-risk fixture is treated as incomplete screening.",
                    "OrbitGuard must not display a clear status when secondary screening is incomplete.",
                ],
                warnings=[f"No secondary-risk fixture found for candidate '{candidate.candidate_id}'."],
            )

        status = self._status_from_concerns(fixture_result)
        if status == fixture_result.status:
            return fixture_result

        return fixture_result.model_copy(
            update={
                "status": status,
                "warnings": [
                    *fixture_result.warnings,
                    f"Fixture status was normalized from '{fixture_result.status}' to '{status}' based on concerns.",
                ],
            }
        )

    def _status_from_concerns(self, result: SecondaryRiskResult) -> str:
        if not result.concerns:
            return "clear" if not result.warnings else "warning"
        severities = {concern.risk.severity for concern in result.concerns}
        if "critical" in severities:
            return "blocked"
        if "warning" in severities:
            return "warning"
        if "watch" in severities:
            return "watch"
        return "warning"
