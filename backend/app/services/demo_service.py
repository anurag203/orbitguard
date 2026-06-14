from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import ValidationError

from app.core.errors import OrbitGuardError
from app.core.paths import project_root
from app.models.demo import DemoReadinessCheck, DemoReplayCheck, DemoReplayResponse, DemoStatusResponse, ExpectedDemoFlow
from app.models.maneuver import ManeuverApplyRequest, ManeuverPlanRequest
from app.models.report import ReportCreateRequest
from app.models.scenario import ScenarioRunRequest
from app.services.conjunction_service import ConjunctionService
from app.services.maneuver_service import ManeuverService
from app.services.report_service import ReportService
from app.services.scenario_service import ScenarioService


DEFAULT_PROJECT_ROOT = project_root()

logger = logging.getLogger("orbitguard.demo")


class DemoService:
    def __init__(
        self,
        root: Path | None = None,
        scenario_service: ScenarioService | None = None,
        conjunction_service: ConjunctionService | None = None,
        maneuver_service: ManeuverService | None = None,
        report_service: ReportService | None = None,
    ) -> None:
        self._root = root or DEFAULT_PROJECT_ROOT
        self._scenario_service = scenario_service or ScenarioService()
        self._conjunction_service = conjunction_service or ConjunctionService()
        self._maneuver_service = maneuver_service or ManeuverService()
        self._report_service = report_service or ReportService()

    def status(self) -> DemoStatusResponse:
        checks = [
            self._file_check("Protect ISRO catalog", "catalog", "data/catalogs/demo-protect-isro.json"),
            self._file_check("Protect ISRO scenario", "scenario", "data/scenarios/protect-isro.json"),
            self._file_check("2009 Replay scenario", "scenario", "data/scenarios/2009-replay.json"),
            self._file_check("Kessler Sandbox scenario", "scenario", "data/scenarios/kessler-sandbox.json"),
            self._file_check("Protect ISRO expected flow", "expected-flow", "data/demo/expected-flows/protect-isro.json"),
            self._file_check("Protect ISRO secondary screening", "secondary-screening", "data/secondary-screening/protect-isro.json"),
        ]
        missing_required_count = sum(1 for check in checks if check.required and check.status != "pass")
        status = "ready" if missing_required_count == 0 else "not-ready"
        return DemoStatusResponse(
            status=status,
            offline_mode=True,
            default_flow_id="protect-isro-round1",
            summary=(
                "Offline demo fixtures are ready for Protect ISRO replay."
                if status == "ready"
                else "Offline demo is missing required fixtures."
            ),
            checks=checks,
            missing_required_count=missing_required_count,
        )

    def expected_flow(self, flow_id: str = "protect-isro-round1") -> ExpectedDemoFlow:
        flow = self._load_expected_flow("protect-isro")
        if flow.flow_id != flow_id:
            raise OrbitGuardError(404, "demo_flow_not_found", f"Demo flow '{flow_id}' was not found.")
        return flow

    def replay(self, flow_id: str = "protect-isro-round1") -> DemoReplayResponse:
        flow = self.expected_flow(flow_id)
        checks: list[DemoReplayCheck] = []

        scenario = self._scenario_service.run_scenario(flow.scenario_id, ScenarioRunRequest(deterministic=True))
        checks.append(self._compare("scenario-run-id", flow.expected_run_id, scenario.run_id))
        checks.append(self._compare("top-conjunction-id", flow.expected_top_conjunction_id, scenario.top_conjunction_id))

        conjunction = self._conjunction_service.get_detail(flow.expected_top_conjunction_id)
        checks.append(self._compare("conjunction-detail-id", flow.expected_top_conjunction_id, conjunction.conjunction_id))

        plan = self._maneuver_service.plan(ManeuverPlanRequest(conjunction_id=flow.expected_top_conjunction_id))
        checks.append(self._compare("maneuver-plan-id", flow.expected_plan_id, plan.plan_id))
        actual_candidate_id = plan.recommendation.candidate_id if plan.recommendation else "none"
        checks.append(self._compare("recommended-candidate-id", flow.expected_candidate_id, actual_candidate_id))

        apply_response = self._maneuver_service.apply(
            ManeuverApplyRequest(plan_id=flow.expected_plan_id, candidate_id=flow.expected_candidate_id)
        )
        checks.append(self._compare("secondary-status", "clear", apply_response.secondary_status))

        report_response = self._report_service.create_report(
            ReportCreateRequest(
                scenario_run_id=flow.expected_run_id,
                conjunction_id=flow.expected_top_conjunction_id,
                plan_id=flow.expected_plan_id,
                candidate_id=flow.expected_candidate_id,
            )
        )
        report = self._report_service.get_report(report_response.report_id)
        checks.append(self._compare("report-candidate-id", flow.expected_candidate_id, report.source_ids.candidate_id))

        status = "passed" if all(check.status == "pass" for check in checks) else "failed"
        logger.info("demo.replay flow=%s status=%s", flow.flow_id, status)
        return DemoReplayResponse(
            flow_id=flow.flow_id,
            status=status,
            summary=(
                "Protect ISRO offline replay matched expected backend outputs."
                if status == "passed"
                else "Protect ISRO offline replay did not match expected backend outputs."
            ),
            checks=checks,
        )

    def _file_check(self, name: str, category: str, relative_path: str, required: bool = True) -> DemoReadinessCheck:
        exists = (self._root / relative_path).exists()
        return DemoReadinessCheck(
            name=name,
            status="pass" if exists else "fail",
            required=required,
            category=category,
            detail=f"{relative_path} {'present' if exists else 'missing'}",
        )

    def _load_expected_flow(self, scenario_id: str) -> ExpectedDemoFlow:
        path = self._root / "data" / "demo" / "expected-flows" / f"{scenario_id}.json"
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return ExpectedDemoFlow.model_validate(data)
        except FileNotFoundError as exc:
            raise OrbitGuardError(
                404,
                "demo_expected_flow_missing",
                f"Expected demo flow for scenario '{scenario_id}' is missing.",
            ) from exc
        except json.JSONDecodeError as exc:
            raise OrbitGuardError(
                500,
                "demo_expected_flow_invalid_json",
                f"Expected demo flow '{scenario_id}' is not valid JSON.",
                {"line": exc.lineno, "column": exc.colno},
            ) from exc
        except ValidationError as exc:
            raise OrbitGuardError(
                500,
                "demo_expected_flow_invalid_schema",
                f"Expected demo flow '{scenario_id}' does not match the expected schema.",
                {"errors": exc.errors()},
            ) from exc

    def _compare(self, name: str, expected: str, actual: str) -> DemoReplayCheck:
        status = "pass" if expected == actual else "fail"
        return DemoReplayCheck(
            name=name,
            status=status,
            expected=expected,
            actual=actual,
            detail=f"{name} {'matched' if status == 'pass' else 'did not match'}",
        )
