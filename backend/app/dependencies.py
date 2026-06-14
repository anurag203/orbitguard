from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request

from app.services.catalog_service import CatalogService
from app.services.conjunction_service import ConjunctionService
from app.services.demo_service import DemoService
from app.services.maneuver_service import ManeuverService
from app.services.propagation_service import PropagationService
from app.services.report_service import ReportService
from app.services.scenario_service import ScenarioService
from app.services.secondary_risk_service import SecondaryRiskService


@dataclass(frozen=True)
class ServiceContainer:
    """Single shared instance of every service for the app's lifetime."""

    catalog: CatalogService
    propagation: PropagationService
    scenario: ScenarioService
    conjunction: ConjunctionService
    secondary_risk: SecondaryRiskService
    maneuver: ManeuverService
    report: ReportService
    demo: DemoService


def build_container() -> ServiceContainer:
    # Build leaves first, then wire collaborators so every service shares the SAME
    # CatalogService (live cache), ConjunctionService (screening cache) and
    # ManeuverService (plan registry) / ReportService (report store).
    catalog = CatalogService()
    propagation = PropagationService(catalog_service=catalog)
    scenario = ScenarioService(catalog_service=catalog)
    conjunction = ConjunctionService(
        catalog_service=catalog,
        propagation_service=propagation,
        scenario_service=scenario,
    )
    secondary_risk = SecondaryRiskService()
    maneuver = ManeuverService(
        conjunction_service=conjunction,
        secondary_risk_service=secondary_risk,
    )
    report = ReportService(
        conjunction_service=conjunction,
        maneuver_service=maneuver,
        secondary_risk_service=secondary_risk,
        scenario_service=scenario,
    )
    demo = DemoService(
        scenario_service=scenario,
        conjunction_service=conjunction,
        maneuver_service=maneuver,
        report_service=report,
    )
    return ServiceContainer(
        catalog=catalog,
        propagation=propagation,
        scenario=scenario,
        conjunction=conjunction,
        secondary_risk=secondary_risk,
        maneuver=maneuver,
        report=report,
        demo=demo,
    )


def get_container(request: Request) -> ServiceContainer:
    return request.app.state.container


def get_catalog_service(request: Request) -> CatalogService:
    return get_container(request).catalog


def get_conjunction_service(request: Request) -> ConjunctionService:
    return get_container(request).conjunction


def get_maneuver_service(request: Request) -> ManeuverService:
    return get_container(request).maneuver


def get_report_service(request: Request) -> ReportService:
    return get_container(request).report


def get_scenario_service(request: Request) -> ScenarioService:
    return get_container(request).scenario


def get_propagation_service(request: Request) -> PropagationService:
    return get_container(request).propagation


def get_demo_service(request: Request) -> DemoService:
    return get_container(request).demo
